import React from 'react';
import { SelectedPhoto, materializeFileList } from '@/features/photos/uploadFlow';

/**
 * Handles a <input type="file"> onChange: materializes the selected files into
 * SelectedPhoto[], reporting any that couldn't be read (e.g. an expired Android
 * content:// permission) via onPhotosDropped instead of silently dropping them.
 */
export function useFileInputSelection(
  onSelected: (selectedPhotos: SelectedPhoto[]) => void,
  onPhotosDropped?: (count: number) => void,
  onLoadingChange?: (isLoading: boolean) => void
) {
  return async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    e.target.value = ''; // must run after snapshotting — files is a live FileList tied to the input

    onLoadingChange?.(true);
    try {
      const { selectedPhotos, droppedCount } = await materializeFileList(fileArray);
      if (droppedCount > 0) onPhotosDropped?.(droppedCount);
      if (selectedPhotos.length === 0) return;

      onSelected(selectedPhotos);
    } finally {
      onLoadingChange?.(false);
    }
  };
}
