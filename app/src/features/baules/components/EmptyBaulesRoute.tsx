import React from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyBaulesScreen } from '@/features/baules/components/EmptyBaulesScreen';

export const EmptyBaulesRoute: React.FC = () => {
  const navigate = useNavigate();
  return (
    <EmptyBaulesScreen onCreateFirstBaul={() => navigate('/baules/nuevo?onboarding=true')} />
  );
};
