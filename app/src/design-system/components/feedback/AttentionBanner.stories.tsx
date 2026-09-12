import type { Meta, StoryObj } from '@storybook/react-vite';
import { AttentionBanner } from '@/design-system/components/feedback/AttentionBanner';

const meta = {
  title: 'Components/Feedback/AttentionBanner',
  component: AttentionBanner,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  args: {
    onCta: () => {},
    onDismiss: () => {},
  },
} satisfies Meta<typeof AttentionBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PendingInvites: Story = {
  args: {
    message: 'Aún hay 5 personas en tu familia que no están invitadas.',
    ctaLabel: 'Invitar',
    dismissLabel: 'Ocultar',
  },
};

export const SinglePendingInvite: Story = {
  args: {
    message: 'Aún hay 1 persona en tu familia que no está invitada.',
    ctaLabel: 'Invitar',
    dismissLabel: 'Ocultar',
  },
};
