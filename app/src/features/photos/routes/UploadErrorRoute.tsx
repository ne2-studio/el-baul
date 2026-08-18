import React from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { UploadErrorScreen } from '@/features/photos/components/UploadErrorScreen';
import { resolvePhotoRouteContext, SelectedPhoto } from '@/features/photos/uploadFlow';

interface UploadErrorRouteProps {
  navigate: (path: string, options?: { state: unknown }) => void;
}

interface LocationState {
  failedPhotos: SelectedPhoto[];
  succeededCount: number;
}

// chapterId is present when the upload targeted a real chapter, absent for the virtual
// "Fotos sueltas" chapter (see useBaulesStore's nullable chapterId convention).
export const UploadErrorRoute: React.FC<UploadErrorRouteProps> = ({
  navigate,
}) => {
  const { baulId, chapterId } = useParams();
  const location = useLocation();
  const { failedPhotos, succeededCount } =
    (location.state as LocationState) || { failedPhotos: [], succeededCount: 0 };

  const { basePath, destination } = resolvePhotoRouteContext({
    baulId: baulId!,
    chapterId,
    chapters: [],
    loosePhotos: [],
  });

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
            chapter: destination,
            succeededCount,
          },
        })
      }
      onBack={() => navigate(basePath)}
    />
  );
};
