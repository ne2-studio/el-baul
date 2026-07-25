import type { Meta, StoryObj } from '@storybook/react-vite';
import { NuevaPersonaModal } from '@/features/people/components/NuevaPersonaModal';

const meta = {
  title: 'Features/People/NuevaPersonaModal',
  component: NuevaPersonaModal,
  tags: ['autodocs'],
} satisfies Meta<typeof NuevaPersonaModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onCancel: () => alert('onCancel clicked'),
    onSave: () => alert('onSave clicked'),
  },
};

export const Submitting: Story = {
  args: {
    onCancel: () => alert('onCancel clicked'),
    onSave: () => alert('onSave clicked'),
    isSubmitting: true,
  },
};
