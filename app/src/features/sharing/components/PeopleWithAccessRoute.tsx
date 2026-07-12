import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PeopleWithAccessScreen } from '@/app/components/PeopleWithAccessScreen';
import { useAppStore } from '@/store/useAppStore';
import { useUIStore } from '@/store/uiStore';
import { BaulRole } from '@/types';
import { useAuth } from 'react-oidc-context';

export const PeopleWithAccessRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baulId } = useParams();
  const auth = useAuth();
  const showToastMessage = useUIStore(state => state.showToastMessage);

  const {
    baules,
    sharedUsers,
    revokeAccess,
    updateUserRole
  } = useAppStore();

  const baul = baules.find(b => b.id === baulId);

  if (!baul) return <div className="p-8 text-center">Cargando...</div>;

  const handleRevoke = async (userId: string) => {
    if (!auth.isAuthenticated) return;
    try {
      const sharedUser = (sharedUsers[baul.id] || []).find(u => u.id === userId);
      if (!sharedUser) return;
      await revokeAccess(baul.id, sharedUser.email);
      showToastMessage('Acceso revocado');
    } catch (error) {
      console.error('Error revoking access:', error);
      showToastMessage('Error al revocar el acceso');
    }
  };

  const handleCancelInvitation = async (userId: string) => {
    if (!auth.isAuthenticated) return;
    try {
      const sharedUser = (sharedUsers[baul.id] || []).find(u => u.id === userId);
      if (!sharedUser) return;
      await revokeAccess(baul.id, sharedUser.email);
      showToastMessage('Invitación cancelada');
    } catch (error) {
      console.error('Error canceling invitation:', error);
      showToastMessage('Error al cancelar la invitación');
    }
  };

  const handleChangeRole = async (userId: string, newRole: BaulRole) => {
    if (!auth.isAuthenticated) return;
    try {
      await updateUserRole(baul.id, userId, newRole);
      showToastMessage('El acceso se ha actualizado');
    } catch (error) {
      console.error('Error updating role:', error);
      showToastMessage('Error al actualizar el rol');
    }
  };
  
  return (
    <PeopleWithAccessScreen
      baul={baul}
      isCustodio={baul.isCustodio}
      sharedUsers={sharedUsers[baul.id] || []}
      onBack={() => navigate(`/baules/${baul.id}`)}
      onRevokeAccess={handleRevoke}
      onCancelInvitation={handleCancelInvitation}
      onChangeRole={handleChangeRole}
    />
  );
};
