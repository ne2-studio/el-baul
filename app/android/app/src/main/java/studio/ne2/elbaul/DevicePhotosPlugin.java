package studio.ne2.elbaul;

import android.Manifest;
import android.app.Activity;
import android.app.PendingIntent;
import android.app.RecoverableSecurityException;
import android.content.ContentResolver;
import android.content.ContentUris;
import android.content.Context;
import android.content.IntentSender;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
import android.webkit.MimeTypeMap;

import androidx.activity.result.ActivityResult;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.IntentSenderRequest;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

// "En este dispositivo" (see docs/architecture/native-android.md and
// EnEsteDispositivoRoute.tsx's boundary note) — a read-only, paginated projection of the
// device's own MediaStore photo library. Deliberately the second custom plugin in this app
// (after ShareReceiverPlugin): per native-android.md, that's the trigger to reconsider a shared
// home for plugin *bridges*, not before — left as-is for this slice since there's still only one
// caller each and nothing to actually share between them.
//
// Permission handling covers Android 13+'s split of READ_MEDIA_IMAGES (full access) and 14+'s
// READ_MEDIA_VISUAL_USER_SELECTED (the user picked only some photos via the system's partial-
// access picker) as two aliases requested together, plus the pre-13 READ_EXTERNAL_STORAGE
// fallback — see hasPhotoAccess(). The JS side never needs to know which one applies; it only
// gets a single granted/not-granted boolean, which is also all this read-only slice needs (the
// UI must not assume MediaStore exposes every photo on the device — partial access is a valid,
// unremarkable state here, not an error).
//
// The actual MediaStore querying/aggregation lives in package-private static methods
// (queryPhotos/queryAlbums) that take a ContentResolver + cache dir instead of a PluginCall —
// @PluginMethod entry points are thin wrappers around them. This is what lets
// DevicePhotosPluginInstrumentedTest exercise real MediaStore queries against a real
// ContentResolver without launching an Activity/Bridge to obtain a PluginCall.
@CapacitorPlugin(
    name = "DevicePhotos",
    permissions = {
        @Permission(strings = { Manifest.permission.READ_MEDIA_IMAGES, "android.permission.READ_MEDIA_VISUAL_USER_SELECTED" }, alias = "photos"),
        @Permission(strings = { Manifest.permission.READ_EXTERNAL_STORAGE }, alias = "photosLegacy")
    }
)
public class DevicePhotosPlugin extends Plugin {

    private static final int DEFAULT_LIMIT = 60;
    // Grid-only sizing (docs' "do not load full-resolution originals" requirement) — decoded
    // once per photo and cached on disk keyed by MediaStore id, so re-entering the screen or
    // scrolling back up never re-decodes what's already there.
    private static final int THUMBNAIL_SIZE_PX = 512;

    // deletePhotos state (GitHub issue #86) — a single MediaStore delete/consent flow spans one
    // or more Activity results, so it can't be resolved synchronously inside the @PluginMethod
    // itself. There's only ever one delete in flight at a time (the JS side awaits the promise
    // before allowing another), so one set of fields is enough; a second concurrent call would
    // overwrite these, which callers must not do.
    private ActivityResultLauncher<IntentSenderRequest> deleteRequestLauncher;
    private PluginCall pendingDeleteCall;
    private List<String> pendingDeletedIds;
    // Non-null only while an API 30+ batch createDeleteRequest() is awaiting its single system
    // dialog — see deletePhotos().
    private List<String> pendingBatchIds;
    // Non-empty only on the API 24-29 fallback path — see processNextLegacyDelete().
    private final Deque<String> remainingLegacyIds = new ArrayDeque<>();
    private String pendingLegacyRetryId;

    @Override
    public void load() {
        // Registered here rather than via the @ActivityCallback annotation: that mechanism only
        // wires up ActivityResultContracts.StartActivityForResult() (a plain Intent), but both the
        // API 30+ MediaStore.createDeleteRequest() PendingIntent and the API 29
        // RecoverableSecurityException PendingIntent must be launched via
        // StartIntentSenderForResult() instead. Bridge#registerForActivityResult accepts any
        // contract, so this reuses the same underlying AndroidX mechanism, just registered by hand
        // at the same lifecycle point (load(), just before initializeActivityLaunchers() runs —
        // see PluginHandle#load) rather than through the annotation.
        deleteRequestLauncher = getBridge().registerForActivityResult(
            new ActivityResultContracts.StartIntentSenderForResult(),
            this::onDeleteRequestResult
        );
    }

    private boolean hasPhotoAccess() {
        Context ctx = getContext();
        if (Build.VERSION.SDK_INT >= 33) {
            boolean full = ContextCompat.checkSelfPermission(ctx, Manifest.permission.READ_MEDIA_IMAGES) == PackageManager.PERMISSION_GRANTED;
            boolean partial = Build.VERSION.SDK_INT >= 34
                && ContextCompat.checkSelfPermission(ctx, "android.permission.READ_MEDIA_VISUAL_USER_SELECTED") == PackageManager.PERMISSION_GRANTED;
            return full || partial;
        }
        return ContextCompat.checkSelfPermission(ctx, Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED;
    }

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", hasPhotoAccess());
        call.resolve(result);
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (hasPhotoAccess()) {
            JSObject result = new JSObject();
            result.put("granted", true);
            call.resolve(result);
            return;
        }
        String alias = Build.VERSION.SDK_INT >= 33 ? "photos" : "photosLegacy";
        requestPermissionForAlias(alias, call, "onPermissionResult");
    }

    @PermissionCallback
    private void onPermissionResult(PluginCall call) {
        // Deliberately re-derives from hasPhotoAccess() rather than trusting Capacitor's own
        // aggregated alias state: "photos" declares two permission strings or'd together
        // (full access OR selected-photos access), not and'd, which is not what Capacitor's
        // default alias-granted check computes.
        JSObject result = new JSObject();
        result.put("granted", hasPhotoAccess());
        call.resolve(result);
    }

    @PluginMethod
    public void getPhotos(PluginCall call) {
        if (!hasPhotoAccess()) {
            call.reject("Permission not granted");
            return;
        }

        int limit = call.getInt("limit", DEFAULT_LIMIT);
        int offset = 0;
        String cursor = call.getString("cursor");
        if (cursor != null) {
            try {
                offset = Integer.parseInt(cursor);
            } catch (NumberFormatException e) {
                offset = 0;
            }
        }

        String albumId = call.getString("albumId");
        ContentResolver resolver = getContext().getContentResolver();

        List<JSObject> photos;
        try {
            photos = queryPhotos(resolver, getContext().getCacheDir(), limit, offset, albumId);
        } catch (Exception e) {
            call.reject("Failed to query device photos", e);
            return;
        }

        JSObject result = new JSObject();
        JSArray photosArray = new JSArray();
        photos.forEach(photosArray::put);
        result.put("photos", photosArray);
        if (photos.size() == limit) {
            result.put("nextCursor", String.valueOf(offset + photos.size()));
        }
        call.resolve(result);
    }

    // Folders/albums grid (Google Photos-style "carpetas primero") — one row per MediaStore
    // bucket (Android's notion of "the folder a photo's file lives in"), newest photo first as
    // the cover. Aggregated by hand over a cursor sorted by bucket rather than via SQL GROUP BY:
    // MediaProvider's queryArg-based grouping needs API 30+, and this plugin's minSdk is 24 (see
    // getPhotos' own sortOrder comment for the same constraint).
    @PluginMethod
    public void getAlbums(PluginCall call) {
        if (!hasPhotoAccess()) {
            call.reject("Permission not granted");
            return;
        }

        ContentResolver resolver = getContext().getContentResolver();
        List<JSObject> albums;
        try {
            albums = queryAlbums(resolver, getContext().getCacheDir());
        } catch (Exception e) {
            call.reject("Failed to query device albums", e);
            return;
        }

        JSObject result = new JSObject();
        JSArray albumsArray = new JSArray();
        albums.forEach(albumsArray::put);
        result.put("albums", albumsArray);
        call.resolve(result);
    }

    // "Subir foto" (GitHub issue #87) — the one caller that needs the actual, full-resolution
    // MediaStore file rather than the cached grid thumbnail above. Deliberately a separate
    // on-demand copy (its own cache subdir, never touched by queryPhotos/queryAlbums) instead of
    // widening THUMBNAIL_SIZE_PX or reusing thumbnailFileFor: the grid still only ever needs to
    // decode/cache the small size for every photo it lists, while this is a full-size copy of
    // just the one photo the user chose to upload.
    @PluginMethod
    public void getOriginalPhoto(PluginCall call) {
        if (!hasPhotoAccess()) {
            call.reject("Permission not granted");
            return;
        }

        String id = call.getString("id");
        if (id == null) {
            call.reject("Missing id");
            return;
        }

        ContentResolver resolver = getContext().getContentResolver();
        JSObject result;
        try {
            result = readOriginal(resolver, getContext().getCacheDir(), id);
        } catch (Exception e) {
            call.reject("Failed to read original device photo", e);
            return;
        }

        if (result == null) {
            call.reject("Device photo not found");
            return;
        }

        call.resolve(result);
    }

    // "Borrar de este dispositivo" (GitHub issue #86) — deletes one or more MediaStore rows this
    // plugin itself doesn't own, which Android never lets an app do silently. Batch-capable from
    // the start even though today's only caller (the single-photo "···" menu) always passes one
    // id, since #88's multi-select batch delete reuses this same method verbatim.
    //
    // This is on top of, not instead of, the app's own ConfirmActionModal that the JS side shows
    // first (see useDeviceDeleteAction/useMyPhotoViewerActions' "Quitar de Mis fotos" for the
    // precedent) — the dialog this method triggers is the second, unavoidable step: Android's own
    // system consent, which no app can skip or auto-confirm.
    //
    // - API 30+: MediaStore.createDeleteRequest() covers the whole batch behind a single system
    //   dialog and deletes all-or-nothing (see onDeleteRequestResult's pendingBatchIds branch).
    // - API 29: no batch API exists yet; ContentResolver.delete() on a row this app doesn't own
    //   throws RecoverableSecurityException, which carries its own per-item system consent
    //   PendingIntent — chased one id at a time (see processNextLegacyDelete()).
    // - API 24-28 (this plugin's minSdk): no RecoverableSecurityException either — a granted
    //   WRITE_EXTERNAL_STORAGE (declared maxSdkVersion=28 in AndroidManifest.xml, since scoped
    //   storage makes it ungrantable from 29 onward) is what actually authorizes
    //   ContentResolver.delete() on another app's row; without it, delete() just returns 0 rather
    //   than throwing, which processNextLegacyDelete() treats as "not deleted", not an error.
    @PluginMethod
    public void deletePhotos(PluginCall call) {
        JSArray idsArray = call.getArray("ids");
        List<String> ids = new ArrayList<>();
        if (idsArray != null) {
            for (int i = 0; i < idsArray.length(); i++) {
                try {
                    ids.add(idsArray.getString(i));
                } catch (Exception ignored) {
                    // skip malformed entries rather than failing the whole batch
                }
            }
        }
        if (ids.isEmpty()) {
            call.reject("No ids provided");
            return;
        }

        bridge.saveCall(call);
        pendingDeleteCall = call;
        pendingDeletedIds = new ArrayList<>();

        if (Build.VERSION.SDK_INT >= 30) {
            List<Uri> uris = new ArrayList<>();
            for (String id : ids) uris.add(photoUri(id));
            PendingIntent pendingIntent = MediaStore.createDeleteRequest(getContext().getContentResolver(), uris);
            pendingBatchIds = new ArrayList<>(ids);
            deleteRequestLauncher.launch(new IntentSenderRequest.Builder(pendingIntent.getIntentSender()).build());
            return;
        }

        remainingLegacyIds.clear();
        remainingLegacyIds.addAll(ids);
        processNextLegacyDelete();
    }

    // Processes remainingLegacyIds synchronously until either the queue drains or one id needs
    // the user's consent via a RecoverableSecurityException — at which point this suspends
    // (returns) and resumes from onDeleteRequestResult once that consent is answered, since a
    // launched IntentSender can't be awaited inline.
    private void processNextLegacyDelete() {
        ContentResolver resolver = getContext().getContentResolver();
        while (!remainingLegacyIds.isEmpty()) {
            String id = remainingLegacyIds.poll();
            try {
                int rows = resolver.delete(photoUri(id), null, null);
                if (rows > 0) pendingDeletedIds.add(id);
            } catch (RecoverableSecurityException e) {
                pendingLegacyRetryId = id;
                IntentSender sender = e.getUserAction().getActionIntent().getIntentSender();
                deleteRequestLauncher.launch(new IntentSenderRequest.Builder(sender).build());
                return;
            } catch (Exception e) {
                // Leave this one undeleted and keep going — same "don't fail the whole batch for
                // one bad id" stance as the malformed-id skip above.
            }
        }
        finishDelete(true);
    }

    private void onDeleteRequestResult(ActivityResult result) {
        boolean granted = result.getResultCode() == Activity.RESULT_OK;

        if (pendingBatchIds != null) {
            List<String> batchIds = pendingBatchIds;
            pendingBatchIds = null;
            if (granted) pendingDeletedIds.addAll(batchIds);
            finishDelete(granted);
            return;
        }

        if (pendingLegacyRetryId != null) {
            String id = pendingLegacyRetryId;
            pendingLegacyRetryId = null;
            if (granted) {
                pendingDeletedIds.add(id);
                processNextLegacyDelete();
            } else {
                // The user denied this one item's consent dialog — stop the chain rather than
                // silently skipping to the next id, so the JS side can report a clear denial
                // instead of a partial, unexplained result.
                remainingLegacyIds.clear();
                finishDelete(false);
            }
        }
    }

    private void finishDelete(boolean granted) {
        PluginCall call = pendingDeleteCall;
        pendingDeleteCall = null;
        if (call == null) return;

        JSObject result = new JSObject();
        result.put("granted", granted);
        JSArray deletedArray = new JSArray();
        pendingDeletedIds.forEach(deletedArray::put);
        result.put("deletedIds", deletedArray);
        call.resolve(result);
        bridge.releaseCall(call);
    }

    private static Uri photoUri(String id) {
        return ContentUris.withAppendedId(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, Long.parseLong(id));
    }

    // Package-private + static: no PluginCall/Plugin instance involved, so instrumented tests
    // can call this directly against a real ContentResolver (see class-level comment above).
    // Always re-copies rather than reusing a previous copy keyed by MediaStore id: "Subir foto"
    // is a rare, user-initiated action (unlike the grid thumbnails, decoded/cached once per
    // photo up front), so there's no meaningful cost to paying for a fresh copy every time —
    // and it sidesteps having to detect an in-place edit (MediaStore keeps the same _ID when a
    // photo is edited, only DATE_MODIFIED/SIZE change) to know a cached copy is stale.
    static JSObject readOriginal(ContentResolver resolver, File cacheDir, String id) throws Exception {
        long mediaStoreId;
        try {
            mediaStoreId = Long.parseLong(id);
        } catch (NumberFormatException e) {
            return null;
        }

        Uri contentUri = ContentUris.withAppendedId(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, mediaStoreId);
        String mimeType = resolver.getType(contentUri);
        if (mimeType == null) mimeType = "image/jpeg";

        File dir = new File(cacheDir, "device-photos-originals");
        if (!dir.exists()) dir.mkdirs();
        String extension = MimeTypeMap.getSingleton().getExtensionFromMimeType(mimeType);
        File outFile = new File(dir, mediaStoreId + (extension != null ? "." + extension : ""));

        if (!copyUriToFile(resolver, contentUri, outFile)) {
            return null;
        }

        JSObject result = new JSObject();
        result.put("uri", outFile.getAbsolutePath());
        result.put("mimeType", mimeType);
        return result;
    }

    // Copies into a sibling ".tmp" file first and only renames it into place once the copy has
    // fully succeeded, deleting the temp file on any failure — a caller that reads outFile never
    // observes a partially-written (truncated/corrupt) copy, whether from a failed or an
    // in-progress concurrent copy. Overwrites any previous outFile atomically via File.renameTo.
    private static boolean copyUriToFile(ContentResolver resolver, Uri uri, File outFile) {
        File tempFile = new File(outFile.getParentFile(), outFile.getName() + ".tmp");
        try (InputStream in = resolver.openInputStream(uri); OutputStream out = new FileOutputStream(tempFile)) {
            if (in == null) {
                tempFile.delete();
                return false;
            }

            byte[] buffer = new byte[8192];
            int read;
            while ((read = in.read(buffer)) != -1) {
                out.write(buffer, 0, read);
            }
            out.flush();
        } catch (Exception e) {
            tempFile.delete();
            return false;
        }

        if (!tempFile.renameTo(outFile)) {
            tempFile.delete();
            return false;
        }
        return true;
    }

    static List<JSObject> queryPhotos(ContentResolver resolver, File cacheDir, int limit, int offset, String albumId) throws Exception {
        Uri collection = MediaStore.Images.Media.EXTERNAL_CONTENT_URI;
        String[] projection = {
            MediaStore.Images.Media._ID,
            MediaStore.Images.Media.DATE_TAKEN,
            MediaStore.Images.Media.DATE_ADDED,
            MediaStore.Images.Media.WIDTH,
            MediaStore.Images.Media.HEIGHT,
        };
        // No LIMIT/OFFSET in the sort order: since Android 10 (API 29), MediaProvider validates
        // sortOrder against a strict grammar and rejects raw SQL clauses like these, throwing an
        // IllegalArgumentException. Paging is instead done by skipping to `offset` via
        // moveToPosition() below, which is a cheap seek against the cursor's CursorWindow rather
        // than a full re-scan, and works uniformly all the way back to minSdk 24.
        String sortOrder = MediaStore.Images.Media.DATE_TAKEN + " DESC, " + MediaStore.Images.Media._ID + " DESC";
        String selection = albumId != null ? MediaStore.Images.Media.BUCKET_ID + " = ?" : null;
        String[] selectionArgs = albumId != null ? new String[] { albumId } : null;

        List<JSObject> photos = new ArrayList<>();

        try (Cursor c = resolver.query(collection, projection, selection, selectionArgs, sortOrder)) {
            if (c != null && c.moveToPosition(offset)) {
                int idCol = c.getColumnIndexOrThrow(MediaStore.Images.Media._ID);
                int dateTakenCol = c.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_TAKEN);
                int dateAddedCol = c.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_ADDED);
                int widthCol = c.getColumnIndexOrThrow(MediaStore.Images.Media.WIDTH);
                int heightCol = c.getColumnIndexOrThrow(MediaStore.Images.Media.HEIGHT);

                int remaining = limit;
                do {
                    if (remaining-- <= 0) break;
                    long id = c.getLong(idCol);
                    Uri contentUri = ContentUris.withAppendedId(collection, id);

                    long dateTakenMs = c.getLong(dateTakenCol);
                    long takenAt = dateTakenMs > 0 ? dateTakenMs : c.getLong(dateAddedCol) * 1000L;

                    File thumbnailFile = thumbnailFileFor(cacheDir, id);
                    if (!thumbnailFile.exists() && !writeThumbnail(resolver, contentUri, thumbnailFile)) {
                        continue;
                    }

                    JSObject photo = new JSObject();
                    photo.put("id", String.valueOf(id));
                    photo.put("uri", thumbnailFile.getAbsolutePath());
                    photo.put("takenAt", takenAt);
                    photo.put("width", c.getInt(widthCol));
                    photo.put("height", c.getInt(heightCol));
                    photos.add(photo);
                } while (c.moveToNext());
            }
        }

        return photos;
    }

    static List<JSObject> queryAlbums(ContentResolver resolver, File cacheDir) throws Exception {
        Uri collection = MediaStore.Images.Media.EXTERNAL_CONTENT_URI;
        String[] projection = {
            MediaStore.Images.Media._ID,
            MediaStore.Images.Media.BUCKET_ID,
            MediaStore.Images.Media.BUCKET_DISPLAY_NAME,
            MediaStore.Images.Media.DATE_TAKEN,
            MediaStore.Images.Media.DATE_ADDED,
        };
        String sortOrder = MediaStore.Images.Media.BUCKET_ID + " ASC, "
            + MediaStore.Images.Media.DATE_TAKEN + " DESC, " + MediaStore.Images.Media._ID + " DESC";

        // LinkedHashMap: preserves first-seen order while we re-sort by cover recency below.
        Map<String, JSObject> albumsById = new LinkedHashMap<>();

        try (Cursor c = resolver.query(collection, projection, null, null, sortOrder)) {
            if (c != null && c.moveToFirst()) {
                int idCol = c.getColumnIndexOrThrow(MediaStore.Images.Media._ID);
                int bucketIdCol = c.getColumnIndexOrThrow(MediaStore.Images.Media.BUCKET_ID);
                int bucketNameCol = c.getColumnIndexOrThrow(MediaStore.Images.Media.BUCKET_DISPLAY_NAME);
                int dateTakenCol = c.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_TAKEN);
                int dateAddedCol = c.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_ADDED);

                do {
                    String bucketId = c.getString(bucketIdCol);
                    if (bucketId == null) continue;

                    JSObject album = albumsById.get(bucketId);
                    if (album == null) {
                        // First row seen for this bucket is also its most recent photo (rows
                        // arrive sorted DATE_TAKEN DESC within each bucket), i.e. the cover.
                        long id = c.getLong(idCol);
                        Uri contentUri = ContentUris.withAppendedId(collection, id);
                        long dateTakenMs = c.getLong(dateTakenCol);
                        long takenAt = dateTakenMs > 0 ? dateTakenMs : c.getLong(dateAddedCol) * 1000L;

                        File thumbnailFile = thumbnailFileFor(cacheDir, id);
                        if (!thumbnailFile.exists() && !writeThumbnail(resolver, contentUri, thumbnailFile)) {
                            continue;
                        }

                        album = new JSObject();
                        album.put("albumId", bucketId);
                        album.put("displayName", c.getString(bucketNameCol));
                        album.put("count", 0);
                        album.put("coverPhotoUri", thumbnailFile.getAbsolutePath());
                        album.put("coverTakenAt", takenAt);
                        albumsById.put(bucketId, album);
                    }
                    album.put("count", album.optInt("count", 0) + 1);
                } while (c.moveToNext());
            }
        }

        List<JSObject> albums = new ArrayList<>(albumsById.values());
        albums.sort((a, b) -> Long.compare(b.optLong("coverTakenAt", 0), a.optLong("coverTakenAt", 0)));
        albums.forEach(album -> album.remove("coverTakenAt"));
        return albums;
    }

    private static File thumbnailFileFor(File cacheDir, long mediaStoreId) {
        File dir = new File(cacheDir, "device-photos-thumbnails");
        if (!dir.exists()) dir.mkdirs();
        return new File(dir, mediaStoreId + ".jpg");
    }

    @SuppressWarnings("deprecation")
    private static boolean writeThumbnail(ContentResolver resolver, Uri contentUri, File outFile) {
        try {
            Bitmap bitmap;
            if (Build.VERSION.SDK_INT >= 29) {
                bitmap = resolver.loadThumbnail(contentUri, new android.util.Size(THUMBNAIL_SIZE_PX, THUMBNAIL_SIZE_PX), null);
            } else {
                long id = ContentUris.parseId(contentUri);
                bitmap = MediaStore.Images.Thumbnails.getThumbnail(resolver, id, MediaStore.Images.Thumbnails.MINI_KIND, null);
            }
            if (bitmap == null) return false;

            try (FileOutputStream out = new FileOutputStream(outFile)) {
                bitmap.compress(Bitmap.CompressFormat.JPEG, 80, out);
            }
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
