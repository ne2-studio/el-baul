import React, { useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { UploadingScreen } from '@/features/photos/components/UploadingScreen';
import { useBaulesStore } from '@/store/useBaulesStore';
import { uploadPhotosWithChapter } from '@/features/photos/useCases';
import { UploadItemResult } from '@/features/photos/uploadFlow';
import { useUIStore } from '@/store/uiStore';
import { useAuth } from 'react-oidc-context';
import { usePostHog } from 'posthog-js/react';
import {
  PhotoUploadDestination,
  resolvePhotoRouteContext,
  SelectedPhoto,
  UploadReturnTo,
  uploadItemsFromSelectedPhotos,
  uploadResultMessage,
} from '@/features/photos/uploadFlow';

interface LocationState {
  selectedPhotos: SelectedPhoto[];
  chapter: PhotoUploadDestination;
  succeededCount?: number;
  returnTo?: UploadReturnTo;
}

export const UploadingRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baulId } = useParams();
  const location = useLocation();
  const auth = useAuth();
  const { baules } = useBaulesStore();
  const showToastMessage = useUIStore((state) => state.showToastMessage);
  const posthog = usePostHog();

  const baul = baules.find(b => b.id === baulId);
  const { selectedPhotos, chapter, succeededCount: succeededSoFar = 0, returnTo } =
    (location.state as LocationState) || { selectedPhotos: [], chapter: { type: 'none' } };

  const resolvedChapterIdRef = useRef<string | null>(null);
  // Generated once per upload attempt (uploadItemsFromSelectedPhotos mints a fresh one on every
  // call) — captured here so handleSettled can send the user to that exact batch's grid, the
  // same batchId the baúl feed's "N fotos subidas" card groups by server-side.
  const uploadBatchIdRef = useRef<string | null>(null);

  if (!baul) return <div className="p-8 text-center">Cargando...</div>;

  const handleUpload = (photos: SelectedPhoto[], onItemSettled: (result: UploadItemResult) => void) => {
    if (!auth.isAuthenticated) return Promise.resolve([]);
    const uploadItems = uploadItemsFromSelectedPhotos(photos);
    uploadBatchIdRef.current = uploadItems[0]?.uploadBatchId ?? null;
    return uploadPhotosWithChapter(
      baul.id,
      chapter,
      uploadItems,
      onItemSettled
    ).then(({ results, chapterId }) => {
      resolvedChapterIdRef.current = chapterId;
      return results;
    });
  };

  const handleSettled = (results: UploadItemResult[]) => {
    const failed = results.filter((r) => r.error);
    // "Ya estaba en el baúl" es un resultado exitoso, no un fallo — nunca cuenta como fallido ni
    // dispara el flujo de reintento (ver docs/.backlog issue #20, addendum de UX).
    const alreadyExisted = results.filter((r) => r.alreadyExisted);
    const newlyUploaded = results.filter((r) => !r.error && !r.alreadyExisted);
    const succeededCount = succeededSoFar + newlyUploaded.length + alreadyExisted.length;
    const resolvedChapterId = resolvedChapterIdRef.current;
    const { basePath: chapterPath } = resolvePhotoRouteContext({
      baulId: baul.id,
      chapterId: resolvedChapterId ?? undefined,
      chapters: [],
      loosePhotos: [],
    });
    const errorPath = `${chapterPath}/error`;

    posthog.capture('photos_upload_completed', {
      succeeded_count: newlyUploaded.length + alreadyExisted.length,
      failed_count: failed.length,
    });

    if (failed.length === 0) {
      // Aterriza en la pantalla del batch recién subido (PhotoBatchGridRoute), no en el
      // capítulo/pestaña de origen — "< Volver" desde ahí usa returnTo para reaparecer donde
      // se inició la subida.
      const batchId = uploadBatchIdRef.current;
      navigate(batchId ? `/baules/${baul.id}/subida/${batchId}` : chapterPath, { state: { returnTo } });
      showToastMessage(uploadResultMessage(newlyUploaded.length, alreadyExisted.length));
      return;
    }

    const failedPhotos = selectedPhotos.filter((p) => failed.some((f) => f.clientUploadId === p.id));
    navigate(errorPath, { state: { failedPhotos, succeededCount, returnTo } });
  };

  return (
    <UploadingScreen photos={selectedPhotos} onUpload={handleUpload} onSettled={handleSettled} />
  );
};
