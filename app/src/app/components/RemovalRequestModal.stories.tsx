import type { Meta, StoryObj } from '@storybook/react-vite';
import { RemovalRequestModal } from './RemovalRequestModal';

const meta = {
  title: 'Components/RemovalRequestModal',
  component: RemovalRequestModal,
  tags: ['autodocs'],
} satisfies Meta<typeof RemovalRequestModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onCancel: () => alert('onCancel clicked'),
    onConfirm: () => alert('onConfirm clicked'),
  },
};

export const Submitting: Story = {
  args: {
    ...Default.args,
    isSubmitting: true,
  },
};
