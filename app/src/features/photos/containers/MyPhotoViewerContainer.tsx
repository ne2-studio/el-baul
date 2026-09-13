import React from 'react';
import { PhotoViewer } from '@/features/photos/components/PhotoViewer';
import { useMyPhotoViewerActions } from '@/features/photos/containers/useMyPhotoViewerActions';
import { PhotoAsset } from '@/types';

interface MyPhotoViewerContainerProps {
  photo: PhotoAsset;
  photos: PhotoAsset[];
  onClose: () => void;
  onPhotoChange: (photo: PhotoAsset) => void;
}

// The "Mis fotos" counterpart to PhotoViewerContainer (docs/.backlog issue #62) — still no
// tagging, recuerdos or date editing, and still no single baúl to hang any of that off of, but
// "Añadir a otro baúl" (Slice 2) and "Quitar de Mis fotos" (Slice 5) are wired in via
// useMyPhotoViewerActions, its own asset-scoped sibling of usePhotoViewerActions. Reuses the
// same presentational PhotoViewer, with baulNames filled in from the asset's own Photo
// appearances instead of a ChapterBadge.
export function MyPhotoViewerContainer({ photo, photos, onClose, onPhotoChange }: MyPhotoViewerContainerProps) {
  const { menuItems, modals, openAddToBaulModal } = useMyPhotoViewerActions({ photo, onRemoved: onClose });

  return (
    <PhotoViewer
      photo={photo}
      photos={photos}
      onClose={onClose}
      onPhotoChange={onPhotoChange}
      menuItems={menuItems}
      canChangeDate={false}
      openDateModal={() => {}}
      modals={modals}
      baulNames={photo.baules.map((b) => b.baulName)}
      onAddToBaul={openAddToBaulModal}
    />
  );
}
