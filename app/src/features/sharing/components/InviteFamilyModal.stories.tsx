import type { Meta, StoryObj } from '@storybook/react-vite';
import { InviteFamilyModal } from '@/features/sharing/components/InviteFamilyModal';
import { BaulInviteLink } from '@/types';

const fakeLink = new BaulInviteLink({
  token: 'abc123',
  url: 'https://app.el-baul.test/invitacion/baul/abc123',
  createdAt: new Date().toISOString(),
});

const meta = {
  title: 'Features/Sharing/InviteFamilyModal',
  component: InviteFamilyModal,
  tags: ['autodocs'],
} satisfies Meta<typeof InviteFamilyModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    baulName: 'Familia Pérez',
    fetchLink: () => Promise.resolve(fakeLink),
    onRegenerate: () => Promise.resolve(fakeLink),
    onCancel: () => alert('onCancel clicked'),
    onToast: (message: string) => alert(message),
  },
};

export const Loading: Story = {
  args: {
    ...Default.args,
    fetchLink: () => new Promise(() => {}),
  },
};
