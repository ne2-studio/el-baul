import React from 'react';
import { SelectedPhoto, materializeSelectedPhoto } from '@/features/photos/components/UploadConfirmationScreen';

/**
 * Handles a <input type="file"> onChange: materializes the selected files into
 * SelectedPhoto[], reporting any that couldn't be read (e.g. an expired Android
 * content:// permission) via onPhotosDropped instead of silently dropping them.
 */
export function useFileInputSelection(
  onSelected: (selectedPhotos: SelectedPhoto[]) => void,
  onPhotosDropped?: (count: number) => void
) {
  return async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    e.target.value = ''; // must run after snapshotting — files is a live FileList tied to the input

    const materialized = await Promise.all(fileArray.map(materializeSelectedPhoto));
    const selectedPhotos = materialized.filter((photo): photo is SelectedPhoto => photo !== null);
    if (materialized.length > selectedPhotos.length) {
      onPhotosDropped?.(materialized.length - selectedPhotos.length);
    }
    if (selectedPhotos.length === 0) return;

    onSelected(selectedPhotos);
  };
}
