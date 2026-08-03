import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MiPerfilScreen } from '@/features/profile/components/MiPerfilScreen';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/uiStore';

export const ProfileRoute: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuthStore();
  const { setShowProfileMenu } = useUIStore();

  return (
    <MiPerfilScreen
      userProfile={userProfile}
      onBack={() => {
        setShowProfileMenu(false);
        navigate('/baules');
      }}
    />
  );
};
