import type { Meta, StoryObj } from '@storybook/react-vite';
import { OnboardingScreen } from '@/features/auth/components/OnboardingScreen';

const meta = {
  title: 'Screens/Onboarding/Slides',
  component: OnboardingScreen,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof OnboardingScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onComplete: () => alert('onComplete clicked'),
  },
};
