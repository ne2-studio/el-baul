import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AccessRequestsScreen } from '@/app/components/AccessRequestsScreen';
import { useDataStore } from '@/store/dataStore';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';

export const AccessRequestsRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baulId } = useParams();
  const accessToken = useAuthStore(state => state.accessToken);
  const showToastMessage = useUIStore(state => state.showToastMessage);
  
  const { 
    baules, 
    accessRequests, 
    approveAccessRequest, 
    rejectAccessRequest 
  } = useDataStore();
  
  const baul = baules.find(b => b.id === baulId);
  
  if (!baul) return <div className="p-8 text-center">Cargando...</div>;
  
  const handleApprove = async (requestId: string) => {
    if (!accessToken) return;
    try {
      await approveAccessRequest(accessToken, baul.id, requestId);
      showToastMessage('Acceso concedido');
    } catch (error) {
      console.error('Error approving request:', error);
      showToastMessage('Error al aprobar la petición');
    }
  };
  
  const handleReject = async (requestId: string) => {
    if (!accessToken) return;
    try {
      await rejectAccessRequest(accessToken, baul.id, requestId);
      showToastMessage('Petición rechazada');
    } catch (error) {
      console.error('Error rejecting request:', error);
      showToastMessage('Error al rechazar la petición');
    }
  };
  
  return (
    <AccessRequestsScreen
      baul={baul}
      requests={accessRequests[baul.id] || []}
      onBack={() => navigate(`/baules/${baul.id}`)}
      onApprove={handleApprove}
      onReject={handleReject}
    />
  );
};
