import type { Meta, StoryObj } from '@storybook/react-vite';
import { DateModal } from './DateModal';

const meta = {
  title: 'Components/DateModal',
  component: DateModal,
  tags: ['autodocs'],
} satisfies Meta<typeof DateModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Cambiar fecha de la foto',
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
