import { create } from 'zustand';
import { Capacitor } from '@capacitor/core';
import { IncomingShare, SharedFile } from '@/native/shareReceiver';
import { SelectedPhoto } from '@/app/components/UploadConfirmationScreen';

interface IncomingShareState {
  share: IncomingShare | null;
  selectedPhotos: SelectedPhoto[];
  loadShare: (share: IncomingShare) => Promise<void>;
  clear: () => void;
}

// The native plugin hands us absolute file paths under app-private storage; convertFileSrc
// turns those into capacitor://localhost/_capacitor_file_/... URLs the WebView can fetch.
async function toSelectedPhoto(sharedFile: SharedFile, index: number): Promise<SelectedPhoto> {
  const webPath = Capacitor.convertFileSrc(sharedFile.path);
  const blob = await (await fetch(webPath)).blob();
  const file = new File([blob], sharedFile.name, { type: sharedFile.mimeType });

  return {
    id: `share-${index}-${sharedFile.name}`,
    file,
    preview: URL.createObjectURL(blob),
  };
}

export const useIncomingShareStore = create<IncomingShareState>((set) => ({
  share: null,
  selectedPhotos: [],

  loadShare: async (share) => {
    const selectedPhotos = await Promise.all(share.files.map(toSelectedPhoto));
    set({ share, selectedPhotos });
  },

  clear: () => set({ share: null, selectedPhotos: [] }),
}));
