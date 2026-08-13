import type { Meta, StoryObj } from '@storybook/react-vite';
import { ManageAccessModal } from '@/features/people/components/ManageAccessModal';

const meta = {
  title: 'Features/Sharing/ManageAccessModal',
  component: ManageAccessModal,
  tags: ['autodocs'],
} satisfies Meta<typeof ManageAccessModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Colaborador: Story = {
  args: {
    role: 'colaborador',
    onSave: () => alert('onSave clicked'),
    onCancel: () => alert('onCancel clicked'),
  },
};

export const Administrador: Story = {
  args: {
    ...Colaborador.args,
    role: 'administrador',
  },
};
