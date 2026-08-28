import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SupportFormScreen } from '@/features/support/components/SupportFormScreen';
import { api } from '@/api';
import { SupportCategory } from '@/types';
import { usePostHog } from 'posthog-js/react';

interface SupportFormRouteProps {
  category: SupportCategory;
  title: string;
}

export const SupportFormRoute: React.FC<SupportFormRouteProps> = ({ category, title }) => {
  const navigate = useNavigate();
  const posthog = usePostHog();

  const handleSubmit = async (message: string) => {
    await api.support.submit(category, message);
    posthog.capture('support_request_submitted', { category });
  };

  return (
    <SupportFormScreen
      title={title}
      onBack={() => navigate('/ayuda')}
      onSubmit={handleSubmit}
    />
  );
};
