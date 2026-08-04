import type { Meta, StoryObj } from '@storybook/react-vite';
import { OnboardingCarousel } from '@/features/auth/components/OnboardingCarousel';

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

export const Invite: Story = {
  args: {
    lastStep: {
      title: 'Este Baúl ya es tuyo',
      description: 'Has sido invitado a formar parte de "Familia García". Empieza a añadir y revivir recuerdos.',
      ctaLabel: 'Entrar al Baúl',
    },
    onComplete: () => alert('onComplete clicked'),
    onSkip: () => alert('onSkip clicked'),
  },
};

export const Signup: Story = {
  args: {
    lastStep: {
      title: 'Crea tu primer baúl',
      description: 'Dale un nombre y empieza a guardar tus recuerdos más preciados.',
      ctaLabel: 'Crear mi primer baúl',
    },
    onComplete: () => alert('onComplete clicked'),
    onSkip: () => alert('onSkip clicked'),
  },
};
