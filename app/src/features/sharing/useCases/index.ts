import { Capacitor } from '@capacitor/core';
import * as Sentry from '@sentry/react';
import { IncomingShare, SharedFile } from '@/features/sharing/native/shareReceiver';
import { materializeSharedPhoto, SelectedPhoto } from '@/features/photos/uploadFlow';
import { useIncomingShareStore } from '@/store/useIncomingShareStore';

// The native plugin hands us absolute file paths under app-private storage; convertFileSrc
// turns those into capacitor://localhost/_capacitor_file_/... URLs the WebView can fetch.
// Reported separately per file (rather than letting one bad share item fail the whole
// batch) so we can see in Sentry exactly which file/mimeType/size trips this up.
async function toSelectedPhoto(sharedFile: SharedFile): Promise<SelectedPhoto | null> {
  const webPath = Capacitor.convertFileSrc(sharedFile.path);

  try {
    const response = await fetch(webPath);
    if (!response.ok) {
      throw new Error(`Local share file fetch failed: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    if (blob.size === 0) {
      throw new Error('Local share file fetch returned an empty blob');
    }

    return materializeSharedPhoto(blob, sharedFile.name, sharedFile.mimeType);
  } catch (error) {
    Sentry.captureException(error, {
      extra: { name: sharedFile.name, mimeType: sharedFile.mimeType, path: sharedFile.path },
    });
    return null;
  }
}

export async function loadShare(share: IncomingShare): Promise<void> {
  const results = await Promise.all(share.files.map(toSelectedPhoto));
  const selectedPhotos = results.filter((photo): photo is SelectedPhoto => photo !== null);

  if (selectedPhotos.length === 0 && share.files.length > 0) {
    Sentry.captureMessage('Incoming share had files but none could be loaded', {
      extra: { fileCount: share.files.length },
    });
  }

  useIncomingShareStore.setState({ share, selectedPhotos });
}

export function clear(): void {
  useIncomingShareStore.setState({ share: null, selectedPhotos: [] });
}
