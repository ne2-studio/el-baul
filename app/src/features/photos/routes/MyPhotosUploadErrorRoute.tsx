import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UploadErrorScreen } from '@/features/photos/components/UploadErrorScreen';
import { SelectedPhoto } from '@/features/photos/uploadFlow';

interface LocationState {
  failedPhotos: SelectedPhoto[];
  succeededCount: number;
}

const MIS_FOTOS_PATH = '/mis-fotos';

// Slice 3 (docs/.backlog issue #62) counterpart to UploadErrorRoute — no chapter/baúl to
// re-resolve for the retry, just the fixed Mis fotos upload path.
export const MyPhotosUploadErrorRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { failedPhotos, succeededCount } =
    (location.state as LocationState) || { failedPhotos: [], succeededCount: 0 };

  return (
    <UploadErrorScreen
      failedPhotos={failedPhotos}
      succeededCount={succeededCount}
      onRetry={() =>
        navigate(`${MIS_FOTOS_PATH}/subir/subiendo`, { state: { selectedPhotos: failedPhotos, succeededCount } })
      }
      onBack={() => navigate(MIS_FOTOS_PATH)}
    />
  );
};
