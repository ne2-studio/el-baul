import React from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { UploadConfirmationScreen } from '@/app/components/UploadConfirmationScreen';
import { Chapter } from '@/app/components/ChaptersView';
import { useAppStore } from '@/store/useAppStore';

export const LooseUploadConfirmationRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baulId } = useParams();
  const location = useLocation();
  const { baules, chapters, loosePhotos } = useAppStore();
  const baul = baules.find(b => b.id === baulId);
  const { selectedPhotos } = location.state || { selectedPhotos: [] };

  if (!baul) return <div className="p-8 text-center">Cargando...</div>;

  const photos = loosePhotos[baul.id] || [];
  const looseChapter: Chapter = {
    id: 'sueltas',
    name: 'Fotos sueltas',
    photoCount: photos.length,
    coverPhotoUrl: photos[0]?.thumbnailUrl,
  };

  return (
    <UploadConfirmationScreen
      baul={baul}
      currentChapter={looseChapter}
      existingChapters={chapters[baul.id] || []}
      selectedPhotos={selectedPhotos}
      onBack={() => navigate(`/baules/${baul.id}/fotos-sueltas`)}
      onUpload={(photos, chapter, date) => {
        navigate(`/baules/${baul.id}/fotos-sueltas/subiendo`, { state: { selectedPhotos: photos, chapter, date } });
      }}
    />
  );
};
