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

export const Default: Story = {
  args: {
    baulNombre: 'Familia García',
    onComplete: () => alert('onComplete clicked'),
    onSkip: () => alert('onSkip clicked'),
  },
};
