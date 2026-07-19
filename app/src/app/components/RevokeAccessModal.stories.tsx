import type { Meta, StoryObj } from '@storybook/react-vite';
import { RevokeAccessModal } from './RevokeAccessModal';

const meta = {
  title: 'Components/RevokeAccessModal',
  component: RevokeAccessModal,
  tags: ['autodocs'],
} satisfies Meta<typeof RevokeAccessModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    userName: 'Tío Juan',
    onConfirm: () => {},
    onCancel: () => {},
  },
};

export const Submitting: Story = {
  args: {
    ...Default.args,
    isSubmitting: true,
  },
};
