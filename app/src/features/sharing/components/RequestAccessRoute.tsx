import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RequestAccessScreen } from '@/app/components/RequestAccessScreen';
import { useDataStore } from '@/store/dataStore';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';

export const RequestAccessRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baulId } = useParams();
  const accessToken = useAuthStore(state => state.accessToken);
  const showToastMessage = useUIStore(state => state.showToastMessage);
  
  const { baules, submitAccessRequest } = useDataStore();
  const baul = baules.find(b => b.id === baulId);
  
  if (!baul) return <div className="p-8 text-center">Cargando...</div>;
  
  const handleSubmit = async (message: string) => {
    if (!accessToken) return;
    
    try {
      await submitAccessRequest(accessToken, baul.id, message);
      showToastMessage('Tu petición ha sido enviada');
      navigate('/baules');
    } catch (error) {
      console.error('Error submitting access request:', error);
      showToastMessage('Error al enviar la petición');
    }
  };
  
  return (
    <RequestAccessScreen
      baul={baul}
      onBack={() => navigate('/baules')}
      onSubmitRequest={handleSubmit}
    />
  );
};
