import type { Meta, StoryObj } from '@storybook/react-vite';
import { NotificationPreferencesScreen } from '@/features/profile/components/NotificationPreferencesScreen';

const meta = {
  title: 'Screens/Profile/NotificationPreferences',
  component: NotificationPreferencesScreen,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof NotificationPreferencesScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Enabled: Story = {
  args: {
    onBack: () => alert('onBack clicked'),
    weeklyDigestEnabled: true,
    onToggle: () => alert('onToggle clicked'),
    isSaving: false,
    showPushToggle: true,
    pushNotificationsEnabled: true,
    onTogglePush: () => alert('onTogglePush clicked'),
    isPushSaving: false,
  },
};

export const Disabled: Story = {
  args: {
    ...Enabled.args,
    weeklyDigestEnabled: false,
    pushNotificationsEnabled: false,
  },
};

export const Saving: Story = {
  args: {
    ...Enabled.args,
    isSaving: true,
    isPushSaving: true,
  },
};

export const PushNotSupported: Story = {
  args: {
    ...Enabled.args,
    showPushToggle: false,
  },
};
