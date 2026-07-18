import React from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { UploadSuccessScreen } from '@/app/components/UploadSuccessScreen';
import { Album } from '@/app/components/AlbumsView';
import { useAppStore } from '@/store/useAppStore';

interface LooseUploadSuccessRouteProps {
  navigate: (path: string) => void;
}

export const LooseUploadSuccessRoute: React.FC<LooseUploadSuccessRouteProps> = ({
  navigate,
}) => {
  const { baulId } = useParams();
  const location = useLocation();
  const { baules, loosePhotos } = useAppStore();
  const baul = baules.find(b => b.id === baulId);
  const photoCount = parseInt(new URLSearchParams(location.search).get('count') || '0');

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
    <UploadSuccessScreen
      baul={baul}
      album={looseAlbum}
      photoCount={photoCount}
      onBack={() => navigate(`/baules/${baul.id}/fotos-sueltas`)}
    />
  );
};
