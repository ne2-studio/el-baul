import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MiPerfilScreen } from '@/features/profile/components/MiPerfilScreen';
import { useAuthStore } from '@/store/useAuthStore';

export const ProfileRoute: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuthStore();

  return (
    <MiPerfilScreen
      userProfile={userProfile}
      onBack={() => navigate('/cuenta')}
    />
  );
};
