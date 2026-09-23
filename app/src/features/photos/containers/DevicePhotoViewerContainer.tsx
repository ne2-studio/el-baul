import React from 'react';
import { PhotoViewer } from '@/features/photos/components/PhotoViewer';
import { DevicePhoto } from '@/features/photos/native/devicePhotos';
import { useDevicePhotoViewerActions } from '@/features/photos/containers/useDevicePhotoViewerActions';

interface DevicePhotoViewerContainerProps {
  photo: DevicePhoto;
  photos: DevicePhoto[];
  onClose: () => void;
  onPhotoChange: (photo: DevicePhoto) => void;
}

// The "En este dispositivo" counterpart to MyPhotoViewerContainer — no date editing, no
// recuerdos/baúles: none of that applies to photos that aren't El Baúl entities (see
// EnEsteDispositivoRoute's boundary note). "Subir foto" (GitHub issue #87, via
// useDevicePhotoViewerActions) is the one exception — it saves a copy into Mis fotos, which is
// an El Baúl entity, without turning this into a full read/write viewer. Reuses the same
// presentational PhotoViewer with everything else optional left out.
export function DevicePhotoViewerContainer({ photo, photos, onClose, onPhotoChange }: DevicePhotoViewerContainerProps) {
  const { menuItems } = useDevicePhotoViewerActions({ photo });

  return (
    <PhotoViewer
      photo={photo}
      photos={photos}
      onClose={onClose}
      onPhotoChange={onPhotoChange}
      menuItems={menuItems}
      canChangeDate={false}
      openDateModal={() => {}}
      modals={null}
    />
  );
}
