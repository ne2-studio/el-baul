import type { Meta, StoryObj } from '@storybook/react-vite';
import { EditPersonaInfoModal } from './EditPersonaInfoModal';
import { Persona } from '@/types';

const meta = {
  title: 'Features/People/EditPersonaInfoModal',
  component: EditPersonaInfoModal,
  tags: ['autodocs'],
} satisfies Meta<typeof EditPersonaInfoModal>;

export default meta;
type Story = StoryObj<typeof meta>;

const persona: Persona = {
  id: '1',
  baulId: 'baul-1',
  name: 'María López',
  nickname: 'Abuela',
  status: 'active',
  role: 'colaborador',
  invitedDate: 'hace 2 meses',
};

export const Default: Story = {
  args: {
    persona,
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
