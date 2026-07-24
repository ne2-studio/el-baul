import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MiPerfilScreen } from '@/app/components/MiPerfilScreen';
import { useAuth } from 'react-oidc-context';
import { useAuthStore } from '@/store/useAuthStore';
import { resetAllStores } from '@/store/session';
import { useUIStore } from '@/store/uiStore';

export const ProfileRoute: React.FC = () => {
  const navigate = useNavigate();
  const auth = useAuth();
  const { userProfile } = useAuthStore();
  const { setShowProfileMenu, showToastMessage } = useUIStore();

  const handleSignOut = async () => {
    try {
      resetAllStores();
      await auth.removeUser();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      showToastMessage('Error al cerrar sesión');
    }
  };

  return (
    <MiPerfilScreen
      userProfile={userProfile}
      onBack={() => {
        setShowProfileMenu(false);
        navigate('/baules');
      }}
      onSignOut={handleSignOut}
    />
  );
};
