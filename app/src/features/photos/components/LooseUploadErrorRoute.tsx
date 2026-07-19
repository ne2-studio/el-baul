import React from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { UploadErrorScreen } from '@/app/components/UploadErrorScreen';
import { SelectedPhoto } from '@/app/components/UploadConfirmationScreen';
import { PhotoDate } from '@/types';

interface LooseUploadErrorRouteProps {
  navigate: (path: string, options?: { state: unknown }) => void;
}

interface LocationState {
  failedPhotos: SelectedPhoto[];
  date: PhotoDate | null;
  succeededCount: number;
}

export const LooseUploadErrorRoute: React.FC<LooseUploadErrorRouteProps> = ({
  navigate,
}) => {
  const { baulId } = useParams();
  const location = useLocation();
  const { failedPhotos, date, succeededCount } =
    (location.state as LocationState) || { failedPhotos: [], date: null, succeededCount: 0 };

  return (
    <UploadErrorScreen
      failedPhotos={failedPhotos}
      succeededCount={succeededCount}
      onRetry={() =>
        navigate(`/baules/${baulId}/fotos-sueltas/subiendo`, {
          state: { selectedPhotos: failedPhotos, chapter: { type: 'none' }, date, succeededCount },
        })
      }
      onBack={() => navigate(`/baules/${baulId}/fotos-sueltas`)}
    />
  );
};
