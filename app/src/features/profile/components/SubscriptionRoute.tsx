import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MiSuscripcionScreen } from '@/app/components/MiSuscripcionScreen';
import { useAppStore } from '@/store/useAppStore';
import { useUIStore } from '@/store/uiStore';

export const SubscriptionRoute: React.FC = () => {
  const navigate = useNavigate();
  const { subscription } = useAppStore();
  const { setShowProfileMenu } = useUIStore();

  return (
    <MiSuscripcionScreen
      subscription={subscription}
      onBack={() => {
        setShowProfileMenu(false);
        navigate('/baules');
      }}
      onChangePlan={() => navigate('/planes')}
    />
  );
};
