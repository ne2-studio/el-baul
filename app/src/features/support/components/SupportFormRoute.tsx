import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SupportFormScreen } from '@/app/components/SupportFormScreen';
import { api } from '@/api';
import { SupportCategory } from '@/types';

interface SupportFormRouteProps {
  category: SupportCategory;
  title: string;
}

export const SupportFormRoute: React.FC<SupportFormRouteProps> = ({ category, title }) => {
  const navigate = useNavigate();

  return (
    <SupportFormScreen
      title={title}
      onBack={() => navigate('/ayuda')}
      onSubmit={(message) => api.support.submit(category, message)}
    />
  );
};
