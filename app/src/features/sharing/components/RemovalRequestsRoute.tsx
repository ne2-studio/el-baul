import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RemovalRequestsList } from '@/app/components/RemovalRequestsList.tsx';
import { useDataStore } from '@/store/dataStore';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';

export const RemovalRequestsRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baulId } = useParams();
  const accessToken = useAuthStore(state => state.accessToken);
  const showToastMessage = useUIStore(state => state.showToastMessage);
  
  const { 
    baules, 
    removalRequests, 
    removePhoto, 
    keepPhoto 
  } = useDataStore();
  
  const baul = baules.find(b => b.id === baulId);
  
  if (!baul) return <div className="p-8 text-center">Cargando...</div>;
  
  const handleRemove = async (requestId: string, photoId: string) => {
    if (!accessToken) return;
    try {
      await removePhoto(accessToken, baul.id, requestId, photoId);
      showToastMessage('La foto ha sido eliminada');
    } catch (error) {
      console.error('Error removing photo:', error);
      showToastMessage('Error al eliminar la foto');
    }
  };
  
  const handleKeep = async (requestId: string) => {
    if (!accessToken) return;
    try {
      await keepPhoto(accessToken, baul.id, requestId);
      showToastMessage('La foto se ha conservado');
    } catch (error) {
      console.error('Error keeping photo:', error);
      showToastMessage('Error al conservar la foto');
    }
  };
  
  return (
    <RemovalRequestsList
      requests={removalRequests[baul.id] || []}
      onBack={() => navigate(`/baules/${baul.id}`)}
      onRemovePhoto={handleRemove}
      onKeepPhoto={handleKeep}
    />
  );
};
