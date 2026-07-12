import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PlanSelectionScreen } from '@/app/components/PlanSelectionScreen';
import { useAppStore } from '@/store/useAppStore';

export const PlanSelectionRoute: React.FC = () => {
  const navigate = useNavigate();
  const { subscription } = useAppStore();

  return (
    <PlanSelectionScreen
      currentPlan={subscription.currentPlan}
      onBack={() => navigate('/suscripcion')}
      onUpdatePlan={(plan) => navigate(`/pago?plan=${plan}`)}
    />
  );
};
