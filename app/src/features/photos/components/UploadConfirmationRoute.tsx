import React from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { UploadConfirmationScreen } from '@/app/components/UploadConfirmationScreen';
import { Chapter } from '@/app/components/ChaptersView';
import { useAppStore } from '@/store/useAppStore';

// chapterId is present when uploading into a real chapter, absent when uploading into the
// virtual "Fotos sueltas" chapter (see useAppStore's nullable chapterId convention).
export const UploadConfirmationRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baulId, chapterId } = useParams();
  const location = useLocation();
  const { baules, chapters, loosePhotos } = useAppStore();
  const baul = baules.find(b => b.id === baulId);
  const existingChapters = chapters[baulId!] || [];
  const looseChapterPhotos = loosePhotos[baulId!] || [];
  const currentChapter: Chapter | undefined = chapterId
    ? existingChapters.find(a => a.id === chapterId)
    : {
        id: 'sueltas',
        name: 'Fotos sueltas',
        photoCount: looseChapterPhotos.length,
        coverPhotoUrl: looseChapterPhotos[0]?.thumbnailUrl,
      };
  const { selectedPhotos } = location.state || { selectedPhotos: [] };

  if (!baul || !currentChapter) return <div className="p-8 text-center">Cargando...</div>;

  const basePath = chapterId ? `/baules/${baul.id}/capitulos/${chapterId}` : `/baules/${baul.id}/fotos-sueltas`;

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
