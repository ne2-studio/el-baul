import type { Meta, StoryObj } from '@storybook/react-vite';
import { WelcomeScreen } from '@/features/auth/components/WelcomeScreen';

const meta = {
  title: 'Screens/Onboarding/Welcome',
  component: WelcomeScreen,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof WelcomeScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onGoogleSignIn: () => alert('onGoogleSignIn clicked'),
  },
};
