import React from 'react';
import * as Sentry from '@sentry/react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { UploadingScreen } from '@/app/components/UploadingScreen';
import { Album } from '@/app/components/AlbumsView';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from 'react-oidc-context';

export const LooseUploadingRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baulId } = useParams();
  const location = useLocation();
  const auth = useAuth();
  const { baules, loosePhotos, uploadLoosePhotos } = useAppStore();

  const baul = baules.find(b => b.id === baulId);
  const { selectedPhotos } = location.state || { selectedPhotos: [] };

  if (!baul) return <div className="p-8 text-center">Cargando...</div>;

  const photos = loosePhotos[baul.id] || [];
  const looseAlbum: Album = {
    id: 'sueltas',
    name: 'Fotos sueltas',
    description: 'Fotos que aún no pertenecen a ningún álbum',
    photoCount: photos.length,
    coverPhotoUrl: photos[0]?.thumbnailUrl,
  };

  const handleUpload = async () => {
    if (!auth.isAuthenticated) return;
    try {
      await uploadLoosePhotos(baul.id, selectedPhotos);
      navigate(`/baules/${baul.id}/fotos-sueltas/exito?count=${selectedPhotos.length}`);
    } catch (error) {
      console.error('Error uploading photos:', error);
      Sentry.captureException(error);
      navigate(`/baules/${baul.id}/fotos-sueltas/error`);
    }
  };

  return (
    <UploadingScreen
      baul={baul}
      album={looseAlbum}
      photoCount={selectedPhotos.length}
      onBack={() => navigate(`/baules/${baul.id}/fotos-sueltas`)}
      onSuccess={handleUpload}
    />
  );
};
