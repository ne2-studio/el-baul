import React, { useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { UploadingScreen } from '@/features/photos/components/UploadingScreen';
import { useBaulesStore } from '@/store/useBaulesStore';
import { uploadPhotosWithChapter } from '@/features/photos/useCases';
import { UploadItemResult } from '@/features/photos/uploadFlow';
import { useUIStore } from '@/store/uiStore';
import { useAuth } from 'react-oidc-context';
import { PhotoDate } from '@/types';
import {
  PhotoUploadDestination,
  resolvePhotoRouteContext,
  SelectedPhoto,
  uploadItemsFromSelectedPhotos,
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
    const succeededCount = succeededSoFar + (results.length - failed.length);
    const resolvedChapterId = resolvedChapterIdRef.current;
    const { basePath: chapterPath } = resolvePhotoRouteContext({
      baulId: baul.id,
      chapterId: resolvedChapterId ?? undefined,
      chapters: [],
      loosePhotos: [],
    });
    const errorPath = `${chapterPath}/error`;

    if (failed.length === 0) {
      navigate(chapterPath);
      showToastMessage(
        succeededCount === 1
          ? 'Tu recuerdo ya está a salvo'
          : `Tus ${succeededCount} recuerdos ya están a salvo`
      );
      return;
    }

    const failedPhotos = selectedPhotos.filter((p) => failed.some((f) => f.clientUploadId === p.id));
    navigate(errorPath, { state: { failedPhotos, date, succeededCount } });
  };

  return (
    <UploadingScreen photos={selectedPhotos} onUpload={handleUpload} onSettled={handleSettled} />
  );
};
