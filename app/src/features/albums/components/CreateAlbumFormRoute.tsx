import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CreateAlbumForm } from '@/app/components/CreateAlbumForm';
import { useDataStore } from '@/store/dataStore';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';

export const CreateAlbumFormRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baulId } = useParams();
  const accessToken = useAuthStore(state => state.accessToken);
  const showToastMessage = useUIStore(state => state.showToastMessage);
  
  const { baules, createAlbum } = useDataStore();
  const baul = baules.find(b => b.id === baulId);
  
  if (!baul) return <div className="p-8 text-center">Cargando baúl...</div>;
  
  const handleSubmit = async (name: string, description: string) => {
    if (!accessToken) return;
    
    try {
      await createAlbum(accessToken, baul.id, name, description);
      navigate(`/baules/${baul.id}`);
    } catch (error) {
      console.error('Error creating album:', error);
      showToastMessage('Error al crear el álbum');
    }
  };
  
  return (
    <CreateAlbumForm
      onBack={() => navigate(`/baules/${baul.id}`)}
      onSubmit={handleSubmit}
    />
  );
};
