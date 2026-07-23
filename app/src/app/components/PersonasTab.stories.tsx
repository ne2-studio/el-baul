import type { Meta, StoryObj } from '@storybook/react-vite';
import { PersonasTab } from './PersonasTab';
import { SharedUser } from '@/types';

const meta = {
  title: 'Components/PersonasTab',
  component: PersonasTab,
  tags: ['autodocs'],
} satisfies Meta<typeof PersonasTab>;

export default meta;
type Story = StoryObj<typeof meta>;

const sharedUsers = [
  new SharedUser({
    id: '1',
    baulId: 'b1',
    email: 'yo@example.com',
    nickname: 'Yo',
    status: 'active',
    role: 'custodio',
    invitedDate: new Date().toISOString(),
  }),
  new SharedUser({
    id: '2',
    baulId: 'b1',
    email: 'abuela@example.com',
    nickname: 'Abuela',
    status: 'active',
    role: 'colaborador',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200',
    invitedDate: new Date().toISOString(),
  }),
  new SharedUser({
    id: '3',
    baulId: 'b1',
    email: 'tio@example.com',
    nickname: 'Tío Paco',
    status: 'pending',
    role: 'administrador',
    invitedDate: new Date().toISOString(),
  }),
];

export const Default: Story = {
  args: {
    sharedUsers,
    currentUserEmail: 'yo@example.com',
    onSelectPersona: () => alert('onSelectPersona clicked'),
  },
};

export const Empty: Story = {
  args: {
    sharedUsers: [],
    onSelectPersona: () => alert('onSelectPersona clicked'),
  },
};
