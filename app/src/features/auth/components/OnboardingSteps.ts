import React from 'react';
import {
  GrowingMemoryIllustration,
  ScatteredMemoriesIllustration,
  SharedSpaceIllustration,
  TrunkReadyIllustration,
  type OnboardingStep,
} from '@/features/auth/components/OnboardingCarousel';

export interface OnboardingFinalStepContent {
  title: string;
  description: string;
  ctaLabel: string;
}

// Title/description for the first three screens — shared with the invite-personalized variant
// (OnboardingInvitePreviewSteps.ts), which reuses this exact copy and only swaps the
// illustration for one built from the invited baúl's real photos/personas.
export const introStepsCopy: { title: string; description: string }[] = [
  {
    title: 'Los recuerdos importantes acaban perdiéndose',
    description: 'Fotos en WhatsApp, vídeos en móviles antiguos, historias que solo recuerda una persona.'
  },
  {
    title: 'Por eso existe un Baúl',
    description: 'Un espacio compartido y seguro donde toda la familia guarda fotos, vídeos y recuerdos en un mismo lugar.'
  },
  {
    title: 'Cada recuerdo hace crecer la historia',
    description: 'Cada uno añade sus fotos, vídeos y recuerdos. Así, el Baúl se convierte en la memoria de toda la familia.'
  }
];

export function buildOnboardingSteps(finalStep: OnboardingFinalStepContent): OnboardingStep[] {
  const illustrations = [
    React.createElement(ScatteredMemoriesIllustration, { key: 'scattered' }),
    React.createElement(SharedSpaceIllustration, { key: 'shared' }),
    React.createElement(GrowingMemoryIllustration, { key: 'growing' })
  ];

  return [
    ...introStepsCopy.map((copy, i) => ({ ...copy, illustration: illustrations[i] })),
    {
      title: finalStep.title,
      description: finalStep.description,
      illustration: React.createElement(TrunkReadyIllustration),
      ctaLabel: finalStep.ctaLabel
    }
  ];
}
