import React from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { UploadConfirmationScreen } from '@/app/components/UploadConfirmationScreen';
import { useAppStore } from '@/store/useAppStore';

export const UploadConfirmationRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baulId, chapterId } = useParams();
  const location = useLocation();
  const { baules, chapters } = useAppStore();
  const baul = baules.find(b => b.id === baulId);
  const currentChapter = chapters[baulId!]?.find(a => a.id === chapterId);
  const { selectedPhotos } = location.state || { selectedPhotos: [] };

  if (!baul || !currentChapter) return <div className="p-8 text-center">Cargando...</div>;

  return (
    <UploadConfirmationScreen
      baul={baul}
      currentChapter={currentChapter}
      existingChapters={chapters[baulId!] || []}
      currentChapterId={currentChapter.id}
      selectedPhotos={selectedPhotos}
      onBack={() => navigate(`/baules/${baul.id}/capitulos/${currentChapter.id}`)}
      onUpload={(photos, chapter, date) => {
        navigate(`/baules/${baul.id}/capitulos/${currentChapter.id}/subiendo`, { state: { selectedPhotos: photos, chapter, date } });
      }}
    />
  );
};
