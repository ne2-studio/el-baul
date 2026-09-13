import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePostHog } from 'posthog-js/react';
import { UploadConfirmationScreen } from '@/features/photos/components/UploadConfirmationScreen';
import { useUIStore } from '@/store/uiStore';
import { SelectedPhoto } from '@/features/photos/uploadFlow';

interface LocationState {
  selectedPhotos?: SelectedPhoto[];
}

const MIS_FOTOS_PATH = '/mis-fotos';

// The Slice 3 (docs/.backlog issue #62) counterpart to UploadConfirmationRoute — no baúl/chapter
// at all, so no resolvePhotoRouteContext/destination to resolve, just the file picker + confirm
// step reused as-is (see UploadConfirmationScreen's subtitle prop, which is exactly what makes
// this reuse possible without a baúl in the loop).
export const MyPhotosUploadConfirmationRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const showToastMessage = useUIStore((state) => state.showToastMessage);
  const posthog = usePostHog();
  const { selectedPhotos = [] } = (location.state as LocationState) || {};

  return (
    <UploadConfirmationScreen
      subtitle="Mis fotos"
      selectedPhotos={selectedPhotos}
      onBack={() => navigate(MIS_FOTOS_PATH)}
      onPhotosDropped={(count) =>
        showToastMessage(`${count} ${count === 1 ? 'foto no se pudo leer y no se ha añadido' : 'fotos no se pudieron leer y no se han añadido'}`, 'error')
      }
      onPhotosLimitExceeded={() => showToastMessage('Se ha limitado la selección a 30 fotos por subida.', 'error')}
      onUpload={(photos) => {
        posthog.capture('personal_photos_upload_started', { photo_count: photos.length });
        navigate(`${MIS_FOTOS_PATH}/subir/subiendo`, { state: { selectedPhotos: photos } });
      }}
    />
  );
};
