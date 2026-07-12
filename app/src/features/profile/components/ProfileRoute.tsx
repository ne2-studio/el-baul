import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MiPerfilScreen } from '@/app/components/MiPerfilScreen';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';

export const ProfileRoute: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile, signOut: storeSignOut } = useAuthStore();
  const { setShowProfileMenu, showToastMessage } = useUIStore();

  const handleSignOut = async () => {
    try {
      await storeSignOut();
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
