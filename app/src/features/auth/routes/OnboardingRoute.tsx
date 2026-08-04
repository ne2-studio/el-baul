import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { OnboardingCarousel } from '@/features/auth/components/OnboardingCarousel';
import { useAuth } from 'react-oidc-context';

export const OnboardingRoute: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const auth = useAuth();
  const baulNombre = searchParams.get('baulNombre') || 'Tu Primer Baúl';
  // The actual "accept this invite" path (persona- or token-scoped) the caller wants to land
  // on once onboarding is done — not just the baúl id, since accepting needs the specific
  // persona/link identifier, not a route that doesn't exist.
  const redirectTarget = searchParams.get('redirectTo');

  const goToNextStep = () => {
    const nextTarget = redirectTarget || '/baules/nuevo?onboarding=true';

    if (!auth.isAuthenticated) {
      navigate(`/?redirectTo=${encodeURIComponent(nextTarget)}`);
      return;
    }

    navigate(nextTarget);
  };

  const handleComplete = goToNextStep;
  const handleSkip = goToNextStep;

  return (
    <OnboardingCarousel 
      baulNombre={baulNombre} 
      onComplete={handleComplete} 
      onSkip={handleSkip} 
    />
  );
};
