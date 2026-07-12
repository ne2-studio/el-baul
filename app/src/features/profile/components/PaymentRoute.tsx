import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PaymentPlaceholderScreen } from '@/app/components/PaymentPlaceholderScreen';
import { PlanType } from '@/types';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';

export const PaymentRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const showToastMessage = useUIStore(state => state.showToastMessage);
  const setSubscription = useAuthStore(state => state.setSubscription);
  const selectedPlan = new URLSearchParams(location.search).get('plan') as PlanType;
  
  return (
    <PaymentPlaceholderScreen
      selectedPlan={selectedPlan}
      onBack={() => navigate('/planes')}
      onComplete={() => {
        const limits = { gratuito: 2, familiar: 5, premium: 10 };
        setSubscription(prev => ({
          ...prev,
          currentPlan: selectedPlan,
          baulesLimit: limits[selectedPlan]
        }));
        showToastMessage('Plan actualizado correctamente');
        navigate('/suscripcion');
      }}
    />
  );
};
