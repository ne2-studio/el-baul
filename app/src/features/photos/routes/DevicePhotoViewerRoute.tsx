import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { DevicePhotoViewerContainer } from '@/features/photos/containers/DevicePhotoViewerContainer';
import { useDevicePhotosStore } from '@/store/useDevicePhotosStore';
import { closePhotoViewer, getBackgroundLocation, navigateToPhotoInViewer, photoViewerPath } from '@/features/photos/viewerNavigation';

// Viewer for "En este dispositivo" — same "no fetch-on-swipe" convention as MyPhotoViewerRoute:
// only shows what DevicePhotoGalleryContainer already loaded into useDevicePhotosStore for this
// album, never re-fetches on its own.
export const DevicePhotoViewerRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { albumId, photoId } = useParams<{ albumId: string; photoId: string }>();

  const basePath = `/en-este-dispositivo/${albumId}`;
  const backgroundLocation = getBackgroundLocation(location);
  const photos = useDevicePhotosStore((state) => state.photos) ?? [];
  const photo = photos.find((p) => p.id === photoId);
  if (!photo) return <div className="p-8 text-center">No se ha encontrado la foto.</div>;

  const closeViewer = () => closePhotoViewer(navigate, backgroundLocation, basePath);

  return (
    <DevicePhotoViewerContainer
      photo={photo}
      photos={photos}
      onClose={closeViewer}
      onPhotoChange={(newPhoto) =>
        navigateToPhotoInViewer(navigate, backgroundLocation, photoViewerPath(basePath, newPhoto.id))
      }
    />
  );
};
