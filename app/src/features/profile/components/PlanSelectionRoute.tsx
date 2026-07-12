import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PlanSelectionScreen } from '@/app/components/PlanSelectionScreen';
import { useAuthStore } from '@/store/authStore';

export const PlanSelectionRoute: React.FC = () => {
  const navigate = useNavigate();
  const { subscription } = useAuthStore();

  return (
    <PlanSelectionScreen
      currentPlan={subscription.currentPlan}
      onBack={() => navigate('/suscripcion')}
      onUpdatePlan={(plan) => navigate(`/pago?plan=${plan}`)}
    />
  );
};
