import React from 'react';
import { PhotoViewer } from '@/features/photos/components/PhotoViewer';
import { PhotoAsset } from '@/types';

interface MyPhotoViewerContainerProps {
  photo: PhotoAsset;
  photos: PhotoAsset[];
  onClose: () => void;
  onPhotoChange: (photo: PhotoAsset) => void;
}

// The read-only "Mis fotos" counterpart to PhotoViewerContainer (docs/.backlog issue #62,
// Slice 1) — no usePhotoViewerActions here at all: no tagging, recuerdos, date editing,
// delete, or "add to another baúl" this slice, and there's no single baúl to hang any of that
// off of anyway. Reuses the same presentational PhotoViewer, just with every action slot
// empty and baulNames filled in from the asset's own Photo appearances instead of a
// ChapterBadge.
export function MyPhotoViewerContainer({ photo, photos, onClose, onPhotoChange }: MyPhotoViewerContainerProps) {
  return (
    <PhotoViewer
      photo={photo}
      photos={photos}
      onClose={onClose}
      onPhotoChange={onPhotoChange}
      menuItems={[]}
      canChangeDate={false}
      openDateModal={() => {}}
      modals={null}
      baulNames={photo.baules.map((b) => b.baulName)}
    />
  );
}
