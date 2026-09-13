import React from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { MyPhotoViewerContainer } from '@/features/photos/containers/MyPhotoViewerContainer';
import { useMyPhotosStore } from '@/store/useMyPhotosStore';
import { closePhotoViewer, getBackgroundLocation, navigateToPhotoInViewer, photoViewerPath } from '@/features/photos/viewerNavigation';

const MIS_FOTOS_BASE_PATH = '/mis-fotos';

// Viewer for "Mis fotos" (docs/.backlog issue #62) — no baulId in this route at all, unlike
// every other photo viewer route. Same "no fetch-on-swipe" convention as BaulPhotoViewerRoute:
// only shows what MyPhotosGalleryContainer already loaded into useMyPhotosStore.
export const MyPhotoViewerRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { assetId } = useParams();

  const backgroundLocation = getBackgroundLocation(location);
  const assets = useMyPhotosStore((state) => state.assets) ?? [];
  const photo = assets.find((a) => a.id === assetId);
  if (!photo) return <div className="p-8 text-center">No se ha encontrado la foto.</div>;

  const closeViewer = () => closePhotoViewer(navigate, backgroundLocation, MIS_FOTOS_BASE_PATH);

  return (
    <MyPhotoViewerContainer
      photo={photo}
      photos={assets}
      onClose={closeViewer}
      onPhotoChange={(newPhoto) =>
        navigateToPhotoInViewer(navigate, backgroundLocation, photoViewerPath(MIS_FOTOS_BASE_PATH, newPhoto.id))
      }
    />
  );
};
