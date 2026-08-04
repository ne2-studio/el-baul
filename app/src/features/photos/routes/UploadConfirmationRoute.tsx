import React from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { UploadConfirmationScreen } from '@/features/photos/components/UploadConfirmationScreen';
import { useBaulesStore } from '@/store/useBaulesStore';
import { resolvePhotoRouteContext } from '@/features/photos/uploadFlow';

// chapterId is present when uploading into a real chapter, absent when uploading into the
// virtual "Fotos sueltas" chapter (see useBaulesStore's nullable chapterId convention).
export const UploadConfirmationRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baulId, chapterId } = useParams();
  const location = useLocation();
  const { baules, chapters, loosePhotos } = useBaulesStore();
  const baul = baules.find(b => b.id === baulId);
  const existingChapters = chapters[baulId!] || [];
  const looseChapterPhotos = loosePhotos[baulId!] || [];
  const { currentChapter, basePath } = baulId
    ? resolvePhotoRouteContext({ baulId, chapterId, chapters: existingChapters, loosePhotos: looseChapterPhotos })
    : { currentChapter: undefined, basePath: '' };
  const { selectedPhotos } = location.state || { selectedPhotos: [] };

  if (!baul || !currentChapter) return <div className="p-8 text-center">Cargando...</div>;

  return (
    <UploadConfirmationScreen
      baul={baul}
      currentChapter={currentChapter}
      existingChapters={existingChapters}
      currentChapterId={chapterId ? currentChapter.id : undefined}
      selectedPhotos={selectedPhotos}
      onBack={() => navigate(basePath)}
      onUpload={(photos, chapter, date) => {
        navigate(`${basePath}/subiendo`, { state: { selectedPhotos: photos, chapter, date } });
      }}
    />
  );
};
