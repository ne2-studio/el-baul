import React from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { UploadConfirmationScreen } from '@/app/components/UploadConfirmationScreen';
import { Album } from '@/app/components/AlbumsView';
import { useAppStore } from '@/store/useAppStore';

export const LooseUploadConfirmationRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baulId } = useParams();
  const location = useLocation();
  const { baules, albums, loosePhotos } = useAppStore();
  const baul = baules.find(b => b.id === baulId);
  const { selectedPhotos } = location.state || { selectedPhotos: [] };

  if (!baul) return <div className="p-8 text-center">Cargando...</div>;

  const photos = loosePhotos[baul.id] || [];
  const looseAlbum: Album = {
    id: 'sueltas',
    name: 'Fotos sueltas',
    description: 'Fotos que aún no pertenecen a ningún capítulo',
    photoCount: photos.length,
    coverPhotoUrl: photos[0]?.thumbnailUrl,
  };

  return (
    <UploadConfirmationScreen
      baul={baul}
      album={looseAlbum}
      existingAlbums={albums[baul.id] || []}
      selectedPhotos={selectedPhotos}
      onBack={() => navigate(`/baules/${baul.id}/fotos-sueltas`)}
      onUpload={(photos, caption, chapter, date) => {
        const finalPhotos = photos.map((p) => ({ ...p, caption: p.caption ?? caption }));
        navigate(`/baules/${baul.id}/fotos-sueltas/subiendo`, { state: { selectedPhotos: finalPhotos, chapter, date } });
      }}
    />
  );
};
