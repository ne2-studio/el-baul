import React from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { UploadConfirmationScreen } from '@/features/photos/components/UploadConfirmationScreen';
import { useBaulesStore } from '@/store/useBaulesStore';
import { hydratePhotos, usePhotosStore } from '@/store/usePhotosStore';
import { useUIStore } from '@/store/uiStore';
import { resolvePhotoRouteContext } from '@/features/photos/uploadFlow';

// chapterId is present when uploading into a real chapter, absent when uploading into the
// virtual "Fotos sueltas" chapter (see useBaulesStore's nullable chapterId convention).
export const UploadConfirmationRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baulId, chapterId } = useParams();
  const location = useLocation();
  const { baules, chapters, loosePhotos } = useBaulesStore();
  const photosById = usePhotosStore((state) => state.photosById);
  const showToastMessage = useUIStore(state => state.showToastMessage);
  const baul = baules.find(b => b.id === baulId);
  const existingChapters = chapters[baulId!] || [];
  const looseChapterPhotos = hydratePhotos(loosePhotos[baulId!], photosById) || [];
  const { currentChapter, basePath, destination } = baulId
    ? resolvePhotoRouteContext({ baulId, chapterId, chapters: existingChapters, loosePhotos: looseChapterPhotos })
    : { currentChapter: undefined, basePath: '', destination: { type: 'none' as const } };
  const { selectedPhotos } = location.state || { selectedPhotos: [] };

  if (!baul || !currentChapter) return <div className="p-8 text-center">Cargando...</div>;

  return (
    <UploadConfirmationScreen
      currentChapter={currentChapter}
      selectedPhotos={selectedPhotos}
      onBack={() => navigate(basePath)}
      onPhotosDropped={(count) =>
        showToastMessage(`${count} ${count === 1 ? 'foto no se pudo leer y no se ha añadido' : 'fotos no se pudieron leer y no se han añadido'}`, 'error')
      }
      onPhotosLimitExceeded={() => showToastMessage('Se ha limitado la selección a 30 fotos por subida.', 'error')}
      onUpload={(photos) => {
        navigate(`${basePath}/subiendo`, { state: { selectedPhotos: photos, chapter: destination } });
      }}
    />
  );
};
