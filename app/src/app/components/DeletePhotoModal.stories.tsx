import type { Meta, StoryObj } from '@storybook/react-vite';
import { DeletePhotoModal } from './DeletePhotoModal';

const meta = {
  title: 'Components/DeletePhotoModal',
  component: DeletePhotoModal,
  tags: ['autodocs'],
} satisfies Meta<typeof DeletePhotoModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onCancel: () => {},
    onConfirm: () => {},
  },
};

export const Submitting: Story = {
  args: {
    ...Default.args,
    isSubmitting: true,
  },
};
