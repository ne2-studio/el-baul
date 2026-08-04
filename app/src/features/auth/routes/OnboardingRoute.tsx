import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { OnboardingCarousel } from '@/features/auth/components/OnboardingCarousel';
import { markOnboardingSeen } from '@/features/auth/useCases';
import { useAuth } from 'react-oidc-context';

export const OnboardingRoute: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const auth = useAuth();
  const baulNombre = searchParams.get('baulNombre') || 'Tu Primer Baúl';
  // The actual "accept this invite" path (persona- or token-scoped) the caller wants to land
  // on once onboarding is done — not just the baúl id, since accepting needs the specific
  // persona/link identifier, not a route that doesn't exist. Its presence is also what tells
  // us apart from a brand-new signup (App.tsx's post-login redirect never sets it): only the
  // invite-preview "ver más" detour does.
  const redirectTarget = searchParams.get('redirectTo');
  const isInvite = redirectTarget !== null;

  const lastStep = isInvite
    ? {
        title: 'Este Baúl ya es tuyo',
        description: `Has sido invitado a formar parte de "${baulNombre}". Empieza a añadir y revivir recuerdos.`,
        ctaLabel: 'Entrar al Baúl',
      }
    : {
        title: 'Crea tu primer baúl',
        description: 'Dale un nombre y empieza a guardar tus recuerdos más preciados.',
        ctaLabel: 'Crear mi primer baúl',
      };

  const goToNextStep = () => {
    const nextTarget = redirectTarget || '/baules/nuevo?onboarding=true';

    // Only the signup path counts as "seen" for good — the invite-preview detour is an
    // optional, repeatable digression, not the once-ever app intro.
    if (!isInvite) markOnboardingSeen();

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
      lastStep={lastStep}
      onComplete={handleComplete}
      onSkip={handleSkip}
    />
  );
};
