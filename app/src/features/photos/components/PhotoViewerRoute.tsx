import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PhotoViewer } from '@/app/components/PhotoViewer';
import { useAppStore } from '@/store/useAppStore';
import { useUIStore } from '@/store/uiStore';
import { useAuth } from 'react-oidc-context';

export const PhotoViewerRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baulId, albumId, photoId } = useParams();
  const auth = useAuth();
  const showToastMessage = useUIStore(state => state.showToastMessage);

  const { baules, albums, photos, recuerdos, loadRecuerdos, addRecuerdo, submitRemovalRequest } = useAppStore();

  const baul = baules.find(b => b.id === baulId);
  const album = albums[baulId!]?.find(a => a.id === albumId);
  const photo = photos[albumId!]?.find(p => p.id === photoId);

  useEffect(() => {
    if (auth.isAuthenticated && photoId) {
      loadRecuerdos(photoId);
    }
  }, [auth.isAuthenticated, photoId, loadRecuerdos]);

  if (!baul || !album || !photo) return <div className="p-8 text-center">Cargando foto...</div>;

  const handleRequestRemoval = async (photo: any, reason: string) => {
    if (!auth.isAuthenticated) return;

    try {
      await submitRemovalRequest(baul.id, photo, reason);
      showToastMessage('Tu solicitud ha sido enviada');
    } catch (error) {
      console.error('Error submitting removal request:', error);
      showToastMessage('Error al enviar la solicitud');
    }
  };

  const handleAddRecuerdo = async (photoId: string, text: string) => {
    if (!auth.isAuthenticated) return;
    try {
      await addRecuerdo(photoId, text);
    } catch (error) {
      console.error('Error adding recuerdo:', error);
      showToastMessage('Error al añadir el recuerdo');
    }
  };

  return (
    <PhotoViewer
      photo={photo}
      photos={photos[album.id] || []}
      onClose={() => navigate(`/baules/${baul.id}/albumes/${album.id}`)}
      onPhotoChange={(newPhoto) => navigate(`/baules/${baul.id}/albumes/${album.id}/foto/${newPhoto.id}`)}
      onRequestRemoval={handleRequestRemoval}
      recuerdos={recuerdos[photo.id] || []}
      onAddRecuerdo={handleAddRecuerdo}
    />
  );
};
