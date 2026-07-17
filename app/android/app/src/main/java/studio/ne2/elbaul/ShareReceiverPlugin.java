package studio.ne2.elbaul;

import android.content.ContentResolver;
import android.content.Intent;
import android.net.Uri;
import android.webkit.MimeTypeMap;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.UUID;

// Copies shared images out of the transient content:// URIs Android hands us in the
// SEND/SEND_MULTIPLE intent and into app-private storage, since those URIs may stop
// resolving once the sending app (e.g. WhatsApp) is gone from memory.
@CapacitorPlugin(name = "ShareReceiver")
public class ShareReceiverPlugin extends Plugin {

    private JSObject pendingShare;

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        handleIntent(intent);
    }

    @SuppressWarnings("deprecation")
    private void handleIntent(Intent intent) {
        if (intent == null) return;

        String action = intent.getAction();
        ArrayList<Uri> uris = new ArrayList<>();

        if (Intent.ACTION_SEND.equals(action)) {
            Uri uri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            if (uri != null) uris.add(uri);
        } else if (Intent.ACTION_SEND_MULTIPLE.equals(action)) {
            ArrayList<Uri> extras = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
            if (extras != null) uris.addAll(extras);
        } else {
            return;
        }

        if (uris.isEmpty()) return;

        String shareId = UUID.randomUUID().toString();
        File shareDir = new File(getContext().getFilesDir(), "incoming-shares/" + shareId);
        shareDir.mkdirs();

        ContentResolver resolver = getContext().getContentResolver();
        JSArray files = new JSArray();
        int index = 0;

        for (Uri uri : uris) {
            String mimeType = resolver.getType(uri);
            if (mimeType == null || !mimeType.startsWith("image/")) continue;

            String extension = MimeTypeMap.getSingleton().getExtensionFromMimeType(mimeType);
            String fileName = "photo-" + index + (extension != null ? "." + extension : "");
            File outFile = new File(shareDir, fileName);

            if (!copyUriToFile(resolver, uri, outFile)) continue;

            JSObject file = new JSObject();
            file.put("path", outFile.getAbsolutePath());
            file.put("mimeType", mimeType);
            file.put("name", fileName);
            files.put(file);
            index++;
        }

        if (files.length() == 0) return;

        JSObject payload = new JSObject();
        payload.put("shareId", shareId);
        payload.put("files", files);

        pendingShare = payload;
        notifyListeners("shareReceived", payload);
    }

    private boolean copyUriToFile(ContentResolver resolver, Uri uri, File outFile) {
        try (InputStream in = resolver.openInputStream(uri); OutputStream out = new FileOutputStream(outFile)) {
            if (in == null) return false;

            byte[] buffer = new byte[8192];
            int read;
            while ((read = in.read(buffer)) != -1) {
                out.write(buffer, 0, read);
            }
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @PluginMethod
    public void getPendingShare(PluginCall call) {
        JSObject result = new JSObject();
        if (pendingShare != null) {
            result.put("share", pendingShare);
        }
        call.resolve(result);
    }

    @PluginMethod
    public void clearPendingShare(PluginCall call) {
        if (pendingShare != null) {
            String shareId = pendingShare.optString("shareId", null);
            if (shareId != null) {
                deleteRecursive(new File(getContext().getFilesDir(), "incoming-shares/" + shareId));
            }
            pendingShare = null;
        }
        call.resolve();
    }

    private void deleteRecursive(File file) {
        if (file.isDirectory()) {
            File[] children = file.listFiles();
            if (children != null) {
                for (File child : children) {
                    deleteRecursive(child);
                }
            }
        }
        file.delete();
    }
}
