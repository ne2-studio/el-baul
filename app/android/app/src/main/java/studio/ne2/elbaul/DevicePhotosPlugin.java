package studio.ne2.elbaul;

import android.Manifest;
import android.content.ContentResolver;
import android.content.ContentUris;
import android.content.Context;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;

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
import java.util.LinkedHashMap;
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

        ContentResolver resolver = getContext().getContentResolver();
        JSArray photos = new JSArray();

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

                    File thumbnailFile = thumbnailFileFor(id);
                    if (!thumbnailFile.exists()) {
                        if (!writeThumbnail(resolver, contentUri, thumbnailFile)) continue;
                    }

                    JSObject photo = new JSObject();
                    photo.put("id", String.valueOf(id));
                    photo.put("uri", thumbnailFile.getAbsolutePath());
                    photo.put("takenAt", takenAt);
                    photo.put("width", c.getInt(widthCol));
                    photo.put("height", c.getInt(heightCol));
                    photos.put(photo);
                } while (c.moveToNext());
            }
        } catch (Exception e) {
            call.reject("Failed to query device photos", e);
            return;
        }

        JSObject result = new JSObject();
        result.put("photos", photos);
        if (photos.length() == limit) {
            result.put("nextCursor", String.valueOf(offset + photos.length()));
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

        ContentResolver resolver = getContext().getContentResolver();
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

                        File thumbnailFile = thumbnailFileFor(id);
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
        } catch (Exception e) {
            call.reject("Failed to query device albums", e);
            return;
        }

        JSArray albums = new JSArray();
        albumsById.values().stream()
            .sorted((a, b) -> Long.compare(b.optLong("coverTakenAt", 0), a.optLong("coverTakenAt", 0)))
            .forEach(album -> {
                album.remove("coverTakenAt");
                albums.put(album);
            });

        JSObject result = new JSObject();
        result.put("albums", albums);
        call.resolve(result);
    }

    private File thumbnailFileFor(long mediaStoreId) {
        File dir = new File(getContext().getCacheDir(), "device-photos-thumbnails");
        if (!dir.exists()) dir.mkdirs();
        return new File(dir, mediaStoreId + ".jpg");
    }

    @SuppressWarnings("deprecation")
    private boolean writeThumbnail(ContentResolver resolver, Uri contentUri, File outFile) {
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
