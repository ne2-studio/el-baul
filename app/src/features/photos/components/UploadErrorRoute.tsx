import React from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { UploadErrorScreen } from '@/app/components/UploadErrorScreen';
import { SelectedPhoto } from '@/app/components/UploadConfirmationScreen';
import { PhotoDate } from '@/types';

interface UploadErrorRouteProps {
  navigate: (path: string, options?: { state: unknown }) => void;
}

interface LocationState {
  failedPhotos: SelectedPhoto[];
  date: PhotoDate | null;
  succeededCount: number;
}

// chapterId is present when the upload targeted a real chapter, absent for the virtual
// "Fotos sueltas" chapter (see useAppStore's nullable chapterId convention).
export const UploadErrorRoute: React.FC<UploadErrorRouteProps> = ({
  navigate,
}) => {
  const { baulId, chapterId } = useParams();
  const location = useLocation();
  const { failedPhotos, date, succeededCount } =
    (location.state as LocationState) || { failedPhotos: [], date: null, succeededCount: 0 };

  const basePath = chapterId ? `/baules/${baulId}/capitulos/${chapterId}` : `/baules/${baulId}/fotos-sueltas`;

  return (
    <UploadErrorScreen
      failedPhotos={failedPhotos}
      succeededCount={succeededCount}
      onRetry={() =>
        // The chapter (existing or freshly created) is already resolved by this point —
        // retry targets it directly rather than re-running the original chapter choice.
        navigate(`${basePath}/subiendo`, {
          state: {
            selectedPhotos: failedPhotos,
            chapter: chapterId ? { type: 'existing', chapterId } : { type: 'none' },
            date,
            succeededCount,
          },
        })
      }
      onBack={() => navigate(basePath)}
    />
  );
};
