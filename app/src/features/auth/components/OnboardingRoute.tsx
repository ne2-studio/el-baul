import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { OnboardingCarousel } from '@/app/components/OnboardingCarousel';
import { useAuthStore } from '@/store/authStore';

export const OnboardingRoute: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const accessToken = useAuthStore(state => state.accessToken);
  const baulNombre = searchParams.get('baulNombre') || 'Tu Primer Baúl';
  const baulId = searchParams.get('baulId');

  const handleComplete = () => {
    if (!accessToken) {
      const nextTarget = baulId 
        ? `/invitacion/${baulId}/aceptar` 
        : '/baules/nuevo?onboarding=true';
      navigate(`/?redirectTo=${encodeURIComponent(nextTarget)}`);
      return;
    }

    if (baulId) {
      navigate(`/invitacion/${baulId}/aceptar`);
    } else {
      navigate('/baules/nuevo?onboarding=true');
    }
  };

  const handleSkip = () => {
    if (!accessToken) {
      const nextTarget = baulId 
        ? `/invitacion/${baulId}/aceptar` 
        : '/baules/nuevo?onboarding=true';
      navigate(`/?redirectTo=${encodeURIComponent(nextTarget)}`);
      return;
    }

    if (baulId) {
      navigate(`/invitacion/${baulId}/aceptar`);
    } else {
      navigate('/baules/nuevo?onboarding=true');
    }
  };

  return (
    <OnboardingCarousel 
      baulNombre={baulNombre} 
      onComplete={handleComplete} 
      onSkip={handleSkip} 
    />
  );
};
