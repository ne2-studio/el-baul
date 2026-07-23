import type { Meta, StoryObj } from '@storybook/react-vite';
import { EditInfoModal } from './EditInfoModal';

const meta = {
  title: 'Components/EditInfoModal',
  component: EditInfoModal,
  tags: ['autodocs'],
} satisfies Meta<typeof EditInfoModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Editar información del baúl',
    initialName: 'Familia Jimena',
    initialDescription: 'Nuestros momentos en familia',
    namePlaceholder: 'Nombre del baúl',
    onCancel: () => alert('onCancel clicked'),
    onSave: () => alert('onSave clicked'),
  },
};

export const Submitting: Story = {
  args: {
    ...Default.args,
    isSubmitting: true,
  },
};
