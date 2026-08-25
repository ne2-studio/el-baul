import React from 'react';
import { PersonaInvitePreview } from '@/types';
import type { OnboardingStep } from '@/features/auth/components/OnboardingCarousel';
import { introStepsCopy } from '@/features/auth/components/OnboardingSteps';
import {
  InviteCoverIllustration,
  InviteMemoryTimelineIllustration,
  InvitePeopleIllustration,
  InvitePreviewPhotosIllustration,
} from '@/features/auth/components/OnboardingInvitePreviewIllustrations';

export function buildInvitePreviewSteps(preview: PersonaInvitePreview): OnboardingStep[] {
  const illustrations = [
    React.createElement(InvitePreviewPhotosIllustration, { key: 'photos', photos: preview.previewPhotos }),
    React.createElement(InvitePeopleIllustration, { key: 'people', avatarUrls: preview.personaAvatarUrls }),
    React.createElement(InviteMemoryTimelineIllustration, { key: 'timeline', photos: preview.previewPhotos })
  ];

  return [
    ...introStepsCopy.map((copy, i) => ({ ...copy, illustration: illustrations[i] })),
    {
      title: preview.name,
      description: 'Te han invitado a formar parte de este Baúl.',
      illustration: React.createElement(InviteCoverIllustration, {
        coverPhotoUrl: preview.coverPhotoUrl,
        fallbackPhotos: preview.previewPhotos
      }),
      ctaLabel: 'Entrar al Baúl'
    }
  ];
}
