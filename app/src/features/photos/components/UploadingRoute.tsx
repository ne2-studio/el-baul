import React, { useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { UploadingScreen } from '@/app/components/UploadingScreen';
import { SelectedPhoto } from '@/app/components/UploadConfirmationScreen';
import { ChapterSelection } from '@/app/components/ChapterSelector';
import { useAppStore, UploadItemResult } from '@/store/useAppStore';
import { useAuth } from 'react-oidc-context';
import { PhotoDate } from '@/types';

interface LocationState {
  selectedPhotos: SelectedPhoto[];
  chapter: ChapterSelection;
  date: PhotoDate | null;
  succeededCount?: number;
}

export const UploadingRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baulId } = useParams();
  const location = useLocation();
  const auth = useAuth();
  const { baules, uploadPhotosWithChapter } = useAppStore();

  const baul = baules.find(b => b.id === baulId);
  const { selectedPhotos, chapter, date, succeededCount: succeededSoFar = 0 } =
    (location.state as LocationState) || { selectedPhotos: [], chapter: { type: 'none' }, date: null };

  const resolvedAlbumIdRef = useRef<string | null>(null);

  if (!baul) return <div className="p-8 text-center">Cargando...</div>;

  const handleUpload = (photos: SelectedPhoto[], onItemSettled: (result: UploadItemResult) => void) => {
    if (!auth.isAuthenticated) return Promise.resolve([]);
    return uploadPhotosWithChapter(
      baul.id,
      chapter,
      photos.map((p) => ({ clientUploadId: p.id, file: p.file, caption: p.caption, date: date ?? undefined })),
      onItemSettled
    ).then(({ results, albumId }) => {
      resolvedAlbumIdRef.current = albumId;
      return results;
    });
  };

  const handleSettled = (results: UploadItemResult[]) => {
    const failed = results.filter((r) => r.error);
    const succeededCount = succeededSoFar + (results.length - failed.length);
    const resolvedAlbumId = resolvedAlbumIdRef.current;
    const successPath = resolvedAlbumId
      ? `/baules/${baul.id}/albumes/${resolvedAlbumId}/exito?count=${succeededCount}`
      : `/baules/${baul.id}/fotos-sueltas/exito?count=${succeededCount}`;
    const errorPath = resolvedAlbumId
      ? `/baules/${baul.id}/albumes/${resolvedAlbumId}/error`
      : `/baules/${baul.id}/fotos-sueltas/error`;

    if (failed.length === 0) {
      navigate(successPath);
      return;
    }

    const failedPhotos = selectedPhotos.filter((p) => failed.some((f) => f.clientUploadId === p.id));
    navigate(errorPath, { state: { failedPhotos, date, succeededCount } });
  };

  return (
    <UploadingScreen photos={selectedPhotos} onUpload={handleUpload} onSettled={handleSettled} />
  );
};
