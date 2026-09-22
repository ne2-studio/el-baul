package studio.ne2.elbaul;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import android.Manifest;
import android.content.ContentResolver;
import android.content.ContentUris;
import android.content.ContentValues;
import android.content.Context;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.rule.GrantPermissionRule;

import com.getcapacitor.JSObject;

import org.junit.After;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;

// Exercises DevicePhotosPlugin.queryPhotos/queryAlbums against the real, on-device MediaStore
// (see DevicePhotosPlugin's class-level comment on why those are package-private statics rather
// than PluginMethods here). Every test seeds its own uniquely-named bucket via
// insertTestPhoto()'s RELATIVE_PATH and filters results down to it — the device this runs on may
// have real photos/albums already, and this must not assert on those.
//
// DATE_TAKEN can't be pinned via the ContentValues passed to insert(): on-device (verified on a
// real Pixel, not an assumption), MediaProvider recomputes it itself from the written file
// rather than trusting the caller. So ordering here is driven by real insertion order plus a
// short sleep between inserts, exactly as it would be if these were real photos taken a moment
// apart — not by asserting specific DATE_TAKEN values.
@RunWith(AndroidJUnit4.class)
public class DevicePhotosPluginInstrumentedTest {

    @Rule
    public GrantPermissionRule permissionRule = GrantPermissionRule.grant(
        Build.VERSION.SDK_INT >= 33 ? Manifest.permission.READ_MEDIA_IMAGES : Manifest.permission.READ_EXTERNAL_STORAGE
    );

    private Context context;
    private ContentResolver resolver;
    private final List<Uri> insertedUris = new ArrayList<>();
    private String testBucket;

    @Before
    public void setUp() {
        context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        resolver = context.getContentResolver();
        testBucket = "ElBaulTest_" + System.nanoTime();
    }

    @After
    public void tearDown() {
        for (Uri uri : insertedUris) {
            resolver.delete(uri, null, null);
        }
        insertedUris.clear();
    }

    private Uri insertTestPhoto(String bucket) throws Exception {
        ContentValues values = new ContentValues();
        values.put(MediaStore.Images.Media.DISPLAY_NAME, "test_" + System.nanoTime() + ".jpg");
        values.put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg");
        values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/" + bucket);
        Uri uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
        assertNotNull("MediaStore insert should succeed", uri);
        insertedUris.add(uri);

        // A real (if tiny) JPEG — loadThumbnail()/getThumbnail() need actual image bytes to
        // decode, same as any real device photo.
        try (OutputStream out = resolver.openOutputStream(uri)) {
            Bitmap bitmap = Bitmap.createBitmap(32, 32, Bitmap.Config.ARGB_8888);
            bitmap.compress(Bitmap.CompressFormat.JPEG, 90, out);
        }
        return uri;
    }

    private JSObject findAlbum(List<JSObject> albums, String displayName) {
        return albums.stream().filter(a -> displayName.equals(a.getString("displayName"))).findFirst().orElse(null);
    }

    @Test
    public void queryAlbums_groupsPhotosByBucketAndUsesNewestAsCover() throws Exception {
        insertTestPhoto(testBucket);
        Thread.sleep(1100); // DATE_TAKEN/DATE_ADDED resolution can be coarse (whole seconds).
        Uri newer = insertTestPhoto(testBucket);

        List<JSObject> albums = DevicePhotosPlugin.queryAlbums(resolver, context.getCacheDir());
        JSObject album = findAlbum(albums, testBucket);

        assertNotNull("Expected an album named " + testBucket, album);
        assertEquals(2, album.getInt("count"));
        assertTrue(album.getString("coverPhotoUri").endsWith(ContentUris.parseId(newer) + ".jpg"));
    }

    @Test
    public void queryPhotos_filtersByAlbumId() throws Exception {
        insertTestPhoto(testBucket);
        insertTestPhoto(testBucket + "_other");

        List<JSObject> albums = DevicePhotosPlugin.queryAlbums(resolver, context.getCacheDir());
        String albumId = findAlbum(albums, testBucket).getString("albumId");

        List<JSObject> photos = DevicePhotosPlugin.queryPhotos(resolver, context.getCacheDir(), 50, 0, albumId);

        assertEquals(1, photos.size());
    }

    @Test
    public void queryPhotos_paginatesNewestFirstWithOffsetAndLimit() throws Exception {
        Uri oldest = insertTestPhoto(testBucket);
        Thread.sleep(1100);
        Uri middle = insertTestPhoto(testBucket);
        Thread.sleep(1100);
        Uri newest = insertTestPhoto(testBucket);

        List<JSObject> albums = DevicePhotosPlugin.queryAlbums(resolver, context.getCacheDir());
        String albumId = findAlbum(albums, testBucket).getString("albumId");

        List<JSObject> firstPage = DevicePhotosPlugin.queryPhotos(resolver, context.getCacheDir(), 2, 0, albumId);
        List<JSObject> secondPage = DevicePhotosPlugin.queryPhotos(resolver, context.getCacheDir(), 2, 2, albumId);

        assertEquals(2, firstPage.size());
        assertEquals(1, secondPage.size());
        assertEquals(String.valueOf(ContentUris.parseId(newest)), firstPage.get(0).getString("id"));
        assertEquals(String.valueOf(ContentUris.parseId(middle)), firstPage.get(1).getString("id"));
        assertEquals(String.valueOf(ContentUris.parseId(oldest)), secondPage.get(0).getString("id"));
    }
}
