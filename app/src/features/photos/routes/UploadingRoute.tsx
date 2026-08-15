import React, { useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { UploadingScreen } from '@/features/photos/components/UploadingScreen';
import { useBaulesStore } from '@/store/useBaulesStore';
import { uploadPhotosWithChapter } from '@/features/photos/useCases';
import { UploadItemResult } from '@/features/photos/uploadFlow';
import { useUIStore } from '@/store/uiStore';
import { useAuth } from 'react-oidc-context';
import { Photo, PhotoDate } from '@/types';
import {
  PhotoUploadDestination,
  resolvePhotoRouteContext,
  SelectedPhoto,
  uploadItemsFromSelectedPhotos,
  uploadResultMessage,
} from '@/features/photos/uploadFlow';

interface LocationState {
  selectedPhotos: SelectedPhoto[];
  chapter: PhotoUploadDestination;
  date: PhotoDate | null;
  succeededCount?: number;
}

export const UploadingRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baulId } = useParams();
  const location = useLocation();
  const auth = useAuth();
  const { baules } = useBaulesStore();
  const showToastMessage = useUIStore((state) => state.showToastMessage);

  const baul = baules.find(b => b.id === baulId);
  const { selectedPhotos, chapter, date, succeededCount: succeededSoFar = 0 } =
    (location.state as LocationState) || { selectedPhotos: [], chapter: { type: 'none' }, date: null };

  const resolvedChapterIdRef = useRef<string | null>(null);

  if (!baul) return <div className="p-8 text-center">Cargando...</div>;

  const handleUpload = (photos: SelectedPhoto[], onItemSettled: (result: UploadItemResult) => void) => {
    if (!auth.isAuthenticated) return Promise.resolve([]);
    return uploadPhotosWithChapter(
      baul.id,
      chapter,
      uploadItemsFromSelectedPhotos(photos, date),
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

    if (failed.length === 0) {
      // Shown as an "Añadido recientemente" swimlane at the top of the chapter (see
      // ChapterRoute) — carried purely via router state, not persisted anywhere, so it
      // naturally disappears the moment the user navigates away from this exact screen,
      // reloads, or reopens the baúl later. No explicit cleanup needed. Excludes photos that
      // already existed: they aren't new arrivals, so they don't belong in "recently added".
      const recentlyUploadedPhotos = newlyUploaded
        .map((result) => result.photo)
        .filter((photo): photo is Photo => photo !== undefined);
      navigate(chapterPath, { state: { recentlyUploadedPhotos } });
      showToastMessage(uploadResultMessage(newlyUploaded.length, alreadyExisted.length));
      return;
    }

    const failedPhotos = selectedPhotos.filter((p) => failed.some((f) => f.clientUploadId === p.id));
    navigate(errorPath, { state: { failedPhotos, date, succeededCount } });
  };

  return (
    <UploadingScreen photos={selectedPhotos} onUpload={handleUpload} onSettled={handleSettled} />
  );
};
