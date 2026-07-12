import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AccessRequestsScreen } from '@/app/components/AccessRequestsScreen';
import { useAppStore } from '@/store/useAppStore';
import { useUIStore } from '@/store/uiStore';
import { useAuth } from 'react-oidc-context';

export const AccessRequestsRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baulId } = useParams();
  const auth = useAuth();
  const showToastMessage = useUIStore(state => state.showToastMessage);

  const {
    baules,
    accessRequests,
    approveAccessRequest,
    rejectAccessRequest
  } = useAppStore();

  const baul = baules.find(b => b.id === baulId);

  if (!baul) return <div className="p-8 text-center">Cargando...</div>;

  const handleApprove = async (requestId: string) => {
    if (!auth.isAuthenticated) return;
    try {
      await approveAccessRequest(baul.id, requestId);
      showToastMessage('Acceso concedido');
    } catch (error) {
      console.error('Error approving request:', error);
      showToastMessage('Error al aprobar la petición');
    }
  };

  const handleReject = async (requestId: string) => {
    if (!auth.isAuthenticated) return;
    try {
      await rejectAccessRequest(baul.id, requestId);
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
