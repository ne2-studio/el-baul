import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PhotoViewer } from '@/app/components/PhotoViewer';
import { useAppStore } from '@/store/useAppStore';
import { useUIStore } from '@/store/uiStore';
import { useAuth } from 'react-oidc-context';

export const LoosePhotoViewerRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baulId, photoId } = useParams();
  const auth = useAuth();
  const showToastMessage = useUIStore(state => state.showToastMessage);

  const { baules, loosePhotos, recuerdos, loadRecuerdos, addRecuerdo, submitRemovalRequest, setBaulCover } = useAppStore();

  const baul = baules.find(b => b.id === baulId);
  const photos = loosePhotos[baulId!] || [];
  const photo = photos.find(p => p.id === photoId);

  useEffect(() => {
    if (auth.isAuthenticated && photoId) {
      loadRecuerdos(photoId);
    }
  }, [auth.isAuthenticated, photoId, loadRecuerdos]);

  if (!baul || !photo) return <div className="p-8 text-center">Cargando foto...</div>;

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

  const handleSetBaulCover = async (photo: any) => {
    if (!auth.isAuthenticated) return;

    try {
      await setBaulCover(baul.id, photo.id);
      showToastMessage('Portada del baúl actualizada');
    } catch (error) {
      console.error('Error setting baul cover:', error);
      showToastMessage('Error al establecer la portada');
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
      photos={photos}
      onClose={() => navigate(`/baules/${baul.id}/fotos-sueltas`)}
      onPhotoChange={(newPhoto) => navigate(`/baules/${baul.id}/fotos-sueltas/foto/${newPhoto.id}`)}
      onRequestRemoval={handleRequestRemoval}
      isCustodio={baul.isCustodio}
      onSetBaulCover={handleSetBaulCover}
      recuerdos={recuerdos[photo.id] || []}
      onAddRecuerdo={handleAddRecuerdo}
    />
  );
};
