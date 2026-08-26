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
    isActive: false,
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

// "Sin acceso" is only offered while the persona hasn't joined yet.
export const Pendiente: Story = {
  args: {
    ...Colaborador.args,
    role: 'sin_acceso',
    isActive: false,
  },
};

export const Activa: Story = {
  args: {
    ...Colaborador.args,
    role: 'colaborador',
    isActive: true,
  },
};
