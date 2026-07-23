import React from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { UploadConfirmationScreen } from '@/app/components/UploadConfirmationScreen';
import { useAppStore } from '@/store/useAppStore';

export const UploadConfirmationRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baulId, albumId } = useParams();
  const location = useLocation();
  const { baules, albums } = useAppStore();
  const baul = baules.find(b => b.id === baulId);
  const album = albums[baulId!]?.find(a => a.id === albumId);
  const { selectedPhotos } = location.state || { selectedPhotos: [] };
  
  if (!baul || !album) return <div className="p-8 text-center">Cargando...</div>;

  return (
    <UploadConfirmationScreen
      baul={baul}
      album={album}
      existingAlbums={albums[baulId!] || []}
      currentAlbumId={album.id}
      selectedPhotos={selectedPhotos}
      onBack={() => navigate(`/baules/${baul.id}/albumes/${album.id}`)}
      onUpload={(photos, chapter, date) => {
        navigate(`/baules/${baul.id}/albumes/${album.id}/subiendo`, { state: { selectedPhotos: photos, chapter, date } });
      }}
    />
  );
};
