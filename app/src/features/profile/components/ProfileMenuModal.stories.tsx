import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProfileMenuModal } from '@/features/profile/components/ProfileMenuModal';
import { viewportGlobals } from '@/storybook/viewports';

const meta = {
  title: 'Features/Profile/ProfileMenuModal',
  component: ProfileMenuModal,
  tags: ['autodocs'],
} satisfies Meta<typeof ProfileMenuModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onClose: () => alert('onClose clicked'),
    onNavigateToProfile: () => alert('onNavigateToProfile clicked'),
    onNavigateToSubscription: () => alert('onNavigateToSubscription clicked'),
    onNavigateToNotifications: () => alert('onNavigateToNotifications clicked'),
    onNavigateToHelp: () => alert('onNavigateToHelp clicked'),
    onSignOut: () => alert('onSignOut clicked'),
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

export const AccountMenuBottomSheetMobile: Story = {
  args: {
    ...Default.args,
  },
  globals: viewportGlobals.mobile,
};

export const AccountMenuNarrowBottomSheet: Story = {
  args: {
    ...Default.args,
  },
  globals: viewportGlobals.narrow,
};

export const AccountMenuCenteredDesktop: Story = {
  args: {
    ...Default.args,
  },
  globals: viewportGlobals.desktop,
};
