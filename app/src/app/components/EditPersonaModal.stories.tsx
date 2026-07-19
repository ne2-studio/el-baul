import type { Meta, StoryObj } from '@storybook/react-vite';
import { EditPersonaModal } from './EditPersonaModal';
import { SharedUser } from '@/types';

const meta = {
  title: 'Components/EditPersonaModal',
  component: EditPersonaModal,
  tags: ['autodocs'],
} satisfies Meta<typeof EditPersonaModal>;

export default meta;
type Story = StoryObj<typeof meta>;

const persona: SharedUser = {
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
    onCancel: () => {},
    onSave: () => {},
    onUploadAvatar: () => {},
  },
};

export const Submitting: Story = {
  args: {
    ...Default.args,
    isSubmitting: true,
  },
};

export const UploadingAvatar: Story = {
  args: {
    ...Default.args,
    isUploadingAvatar: true,
  },
};
