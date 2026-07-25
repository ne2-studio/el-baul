import type { Meta, StoryObj } from '@storybook/react-vite';
import { EditBiografiaModal } from '@/features/people/components/EditBiografiaModal';

const meta = {
  title: 'Features/People/EditBiografiaModal',
  component: EditBiografiaModal,
  tags: ['autodocs'],
} satisfies Meta<typeof EditBiografiaModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    initialBiografia: '',
    onCancel: () => alert('onCancel clicked'),
    onSave: () => alert('onSave clicked'),
  },
};

export const WithExistingBiografia: Story = {
  args: {
    ...Default.args,
    initialBiografia: 'Nació en Sevilla en 1950. Le encantaba la repostería y contar historias de su juventud.',
  },
};

export const Submitting: Story = {
  args: {
    ...Default.args,
    isSubmitting: true,
  },
};
