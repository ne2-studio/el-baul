import { create } from 'zustand';
import { IncomingShare } from '@/native/shareReceiver';
import { SelectedPhoto } from '@/features/photos/uploadFlow';

interface IncomingShareState {
  share: IncomingShare | null;
  selectedPhotos: SelectedPhoto[];
}

// Actions live in features/sharing/useCases — this store only holds state.
export const useIncomingShareStore = create<IncomingShareState>(() => ({
  share: null,
  selectedPhotos: [],
}));
