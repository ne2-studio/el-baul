import React from 'react';
import { PhotoViewer } from '@/features/photos/components/PhotoViewer';
import { DevicePhoto } from '@/features/photos/native/devicePhotos';

interface DevicePhotoViewerContainerProps {
  photo: DevicePhoto;
  photos: DevicePhoto[];
  onClose: () => void;
  onPhotoChange: (photo: DevicePhoto) => void;
}

// The "En este dispositivo" counterpart to MyPhotoViewerContainer — read-only, no menu, no date
// editing, no recuerdos/baúles: none of that applies to photos that aren't El Baúl entities (see
// EnEsteDispositivoRoute's boundary note). Reuses the same presentational PhotoViewer with
// everything optional left out.
export function DevicePhotoViewerContainer({ photo, photos, onClose, onPhotoChange }: DevicePhotoViewerContainerProps) {
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
    />
  );
}
