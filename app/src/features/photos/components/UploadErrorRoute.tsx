import React from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { UploadErrorScreen } from '@/app/components/UploadErrorScreen';
import { SelectedPhoto } from '@/app/components/UploadConfirmationScreen';

interface UploadErrorRouteProps {
  navigate: (path: string, options?: { state: unknown }) => void;
}

interface LocationState {
  failedPhotos: SelectedPhoto[];
  succeededCount: number;
}

export const UploadErrorRoute: React.FC<UploadErrorRouteProps> = ({
  navigate,
}) => {
  const { baulId, albumId } = useParams();
  const location = useLocation();
  const { failedPhotos, succeededCount } = (location.state as LocationState) || { failedPhotos: [], succeededCount: 0 };

  return (
    <UploadErrorScreen
      failedPhotos={failedPhotos}
      succeededCount={succeededCount}
      onRetry={() =>
        navigate(`/baules/${baulId}/albumes/${albumId}/subiendo`, {
          state: { selectedPhotos: failedPhotos, succeededCount },
        })
      }
      onBack={() => navigate(`/baules/${baulId}/albumes/${albumId}`)}
    />
  );
};
