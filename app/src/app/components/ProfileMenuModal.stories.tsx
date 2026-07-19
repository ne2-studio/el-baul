import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProfileMenuModal } from './ProfileMenuModal';

const meta = {
  title: 'Components/ProfileMenuModal',
  component: ProfileMenuModal,
  tags: ['autodocs'],
} satisfies Meta<typeof ProfileMenuModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onClose: () => {},
    onNavigateToProfile: () => {},
    onNavigateToSubscription: () => {},
    onSignOut: () => {},
    userEmail: 'pedro@example.com',
    monetizationEnabled: true,
  },
};

export const WithoutMonetization: Story = {
  args: {
    ...Default.args,
    monetizationEnabled: false,
  },
};

export const SigningOut: Story = {
  args: {
    ...Default.args,
    isSigningOut: true,
  },
};
