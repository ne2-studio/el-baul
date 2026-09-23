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

// EnEsteDispositivoRoute's boundary note). "Subir foto" (GitHub issue #87, via
// useDevicePhotoViewerActions) is one exception — it saves a copy into Mis fotos, which is an
// El Baúl entity, without turning this into a full read/write viewer. Still no selection/batch
// actions (that stays out of scope until #88) — but no longer read-only: "Borrar de este
// dispositivo" (GitHub issue #86) is this feature's first destructive single-photo action, also
// wired in via useDevicePhotoViewerActions. Reuses the same presentational PhotoViewer, with
// everything else optional left out.
export function DevicePhotoViewerContainer({ photo, photos, onClose, onPhotoChange }: DevicePhotoViewerContainerProps) {
  const { menuItems, modals } = useDevicePhotoViewerActions({ photo, onDeleted: onClose });

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
    />
  );
}
