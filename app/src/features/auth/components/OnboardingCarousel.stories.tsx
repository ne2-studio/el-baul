import type { Meta, StoryObj } from '@storybook/react-vite';
import { OnboardingCarousel, buildOnboardingSteps } from '@/features/auth/components/OnboardingCarousel';

const meta = {
  title: 'Screens/Onboarding/Carousel',
  component: OnboardingCarousel,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof OnboardingCarousel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InviteFallback: Story = {
  args: {
    steps: buildOnboardingSteps({
      title: 'Te han invitado a formar parte de este Baúl',
      description: 'Te unirás al Baúl "Familia García" para añadir fotos, recuerdos y formar parte de vuestra historia familiar.',
      ctaLabel: 'Entrar al Baúl',
    }),
    onComplete: () => alert('onComplete clicked'),
    onSkip: () => alert('onSkip clicked'),
  },
};

export const Signup: Story = {
  args: {
    steps: buildOnboardingSteps({
      title: 'Crea vuestro Baúl',
      description: 'Dale un nombre y guardad juntos vuestros primeros recuerdos.',
      ctaLabel: 'Crear mi Baúl',
    }),
    onComplete: () => alert('onComplete clicked'),
    onSkip: () => alert('onSkip clicked'),
  },
};
