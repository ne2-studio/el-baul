import React from 'react';
import { useParams } from 'react-router-dom';
import { UploadErrorScreen } from '@/app/components/UploadErrorScreen';
import { Album } from '@/app/components/AlbumsView';
import { useAppStore } from '@/store/useAppStore';

interface LooseUploadErrorRouteProps {
  navigate: (path: string) => void;
}

export const LooseUploadErrorRoute: React.FC<LooseUploadErrorRouteProps> = ({
  navigate,
}) => {
  const { baulId } = useParams();
  const { baules, loosePhotos } = useAppStore();
  const baul = baules.find(b => b.id === baulId);

  if (!baul) return <div className="p-8 text-center">Cargando...</div>;

  const photos = loosePhotos[baul.id] || [];
  const looseAlbum: Album = {
    id: 'sueltas',
    name: 'Fotos sueltas',
    description: 'Fotos que aún no pertenecen a ningún álbum',
    photoCount: photos.length,
    coverPhotoUrl: photos[0]?.thumbnailUrl,
  };

  return (
    <UploadErrorScreen
      baul={baul}
      album={looseAlbum}
      onBack={() => navigate(`/baules/${baul.id}/fotos-sueltas`)}
    />
  );
};
