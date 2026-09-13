import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePostHog } from 'posthog-js/react';
import { UploadingScreen } from '@/features/photos/components/UploadingScreen';
import { uploadItemsFromSelectedPhotos, uploadResultMessage, SelectedPhoto } from '@/features/photos/uploadFlow';
import { UploadItemResult } from '@/features/photos/uploadFlow';
import { uploadToMyPhotos } from '@/features/photos/useCases';
import { useUIStore } from '@/store/uiStore';

interface LocationState {
  selectedPhotos: SelectedPhoto[];
  succeededCount?: number;
}

const MIS_FOTOS_PATH = '/mis-fotos';

// Slice 3 (docs/.backlog issue #62) counterpart to UploadingRoute — reuses the same
// UploadingScreen (fully generic over onUpload/onSettled), targeting uploadToMyPhotos instead
// of uploadPhotosWithChapter. Lands back on Mis fotos itself instead of a per-batch grid screen
// (PhotoBatchGridRoute) — there's no baúl-scoped "upload batch" concept for a Mis fotos upload.
export const MyPhotosUploadingRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const showToastMessage = useUIStore((state) => state.showToastMessage);
  const posthog = usePostHog();
  const { selectedPhotos, succeededCount: succeededSoFar = 0 } =
    (location.state as LocationState) || { selectedPhotos: [] };

  const handleUpload = (photos: SelectedPhoto[], onItemSettled: (result: UploadItemResult) => void) =>
    uploadToMyPhotos(uploadItemsFromSelectedPhotos(photos), onItemSettled);

  const handleSettled = (results: UploadItemResult[]) => {
    const failed = results.filter((r) => r.error);
    const newlyUploaded = results.filter((r) => !r.error);
    const succeededCount = succeededSoFar + newlyUploaded.length;

    posthog.capture('personal_photos_upload_completed', {
      succeeded_count: newlyUploaded.length,
      failed_count: failed.length,
    });

    if (failed.length === 0) {
      navigate(MIS_FOTOS_PATH);
      showToastMessage(uploadResultMessage(newlyUploaded.length, 0));
      return;
    }

    const failedPhotos = selectedPhotos.filter((p) => failed.some((f) => f.clientUploadId === p.id));
    navigate(`${MIS_FOTOS_PATH}/subir/error`, { state: { failedPhotos, succeededCount } });
  };

  return (
    <UploadingScreen photos={selectedPhotos} onUpload={handleUpload} onSettled={handleSettled} />
  );
};
