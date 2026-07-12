import React from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { UploadingScreen } from '@/app/components/UploadingScreen';
import { useDataStore } from '@/store/dataStore';
import { useAuthStore } from '@/store/authStore';

export const UploadingRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baulId, albumId } = useParams();
  const location = useLocation();
  const accessToken = useAuthStore(state => state.accessToken);
  const { baules, albums, uploadPhotos } = useDataStore();
  
  const baul = baules.find(b => b.id === baulId);
  const album = albums[baulId!]?.find(a => a.id === albumId);
  const { selectedPhotos } = location.state || { selectedPhotos: [] };
  
  if (!baul || !album) return <div className="p-8 text-center">Cargando...</div>;
  
  const handleUpload = async () => {
    if (!accessToken) return;
    try {
      await uploadPhotos(accessToken, baul.id, album.id, selectedPhotos);
      navigate(`/baules/${baul.id}/albumes/${album.id}/exito?count=${selectedPhotos.length}`);
    } catch (error) {
      console.error('Error uploading photos:', error);
      navigate(`/baules/${baul.id}/albumes/${album.id}/error`);
    }
  };
  
  return (
    <UploadingScreen
      baul={baul}
      album={album}
      photoCount={selectedPhotos.length}
      onBack={() => navigate(`/baules/${baul.id}/albumes/${album.id}`)}
      onSuccess={handleUpload}
      onError={() => {
        navigate(`/baules/${baul.id}/albumes/${album.id}/error`);
      }}
    />
  );
};
