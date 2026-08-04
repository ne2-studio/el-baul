import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { OnboardingCarousel, buildOnboardingSteps } from '@/features/auth/components/OnboardingCarousel';
import { buildInvitePreviewSteps } from '@/features/auth/components/OnboardingInvitePreviewSteps';
import { markOnboardingSeen } from '@/features/auth/useCases';
import { useAuth } from 'react-oidc-context';
import { api } from '@/api';
import { BaulInviteLinkPreview } from '@/types';

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
  const inviteToken = searchParams.get('token');

  // Best-effort: the invite-preview endpoint is public but the personalized carousel is a
  // nice-to-have layer, not a hard dependency. If there's no token, or the fetch fails (link
  // revoked between screens, network blip), onboarding just falls back to the generic variant
  // below rather than blocking or erroring the "ver más" detour.
  const [invitePreview, setInvitePreview] = useState<BaulInviteLinkPreview | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(isInvite && inviteToken !== null);

  useEffect(() => {
    if (!isInvite || !inviteToken) return;

    let cancelled = false;
    api.baulInvites.getPreview(inviteToken)
      .then((preview) => {
        if (!cancelled) setInvitePreview(preview);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isInvite, inviteToken]);

  const genericLastStep = isInvite
    ? {
        title: 'Te han invitado a formar parte de este Baúl',
        description: `Te unirás al Baúl "${baulNombre}" para añadir fotos, recuerdos y formar parte de vuestra historia familiar.`,
        ctaLabel: 'Entrar al Baúl',
      }
    : {
        title: 'Crea vuestro Baúl',
        description: 'Dale un nombre y guardad juntos vuestros primeros recuerdos.',
        ctaLabel: 'Crear mi Baúl',
      };

  const goToNextStep = () => {
    const nextTarget = redirectTarget || '/baules/nuevo';

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

  if (isPreviewLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  const steps = invitePreview
    ? buildInvitePreviewSteps(invitePreview)
    : buildOnboardingSteps(genericLastStep);

  return (
    <OnboardingCarousel
      steps={steps}
      onComplete={handleComplete}
      onSkip={handleSkip}
    />
  );
};
