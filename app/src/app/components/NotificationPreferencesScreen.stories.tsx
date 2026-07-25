import type { Meta, StoryObj } from '@storybook/react-vite';
import { NotificationPreferencesScreen } from './NotificationPreferencesScreen';

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
  },
};

export const Disabled: Story = {
  args: {
    ...Enabled.args,
    weeklyDigestEnabled: false,
  },
};

export const Saving: Story = {
  args: {
    ...Enabled.args,
    isSaving: true,
  },
};
