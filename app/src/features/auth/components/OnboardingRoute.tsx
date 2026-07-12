import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { OnboardingCarousel } from '@/app/components/OnboardingCarousel';
import { useAuth } from 'react-oidc-context';

export const OnboardingRoute: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const auth = useAuth();
  const baulNombre = searchParams.get('baulNombre') || 'Tu Primer Baúl';
  const baulId = searchParams.get('baulId');

  const handleComplete = () => {
    if (!auth.isAuthenticated) {
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
    if (!auth.isAuthenticated) {
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
