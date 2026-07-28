import type { Meta, StoryObj } from '@storybook/react-vite';
import { PersonasTab } from '@/features/people/components/PersonasTab';
import { Persona } from '@/types';
import { fixedStorybookDateIso, storybookAvatars } from '@/storybook/fixtures';

const meta = {
  title: 'Features/People/PersonasTab',
  component: PersonasTab,
  tags: ['autodocs'],
} satisfies Meta<typeof PersonasTab>;

export default meta;
type Story = StoryObj<typeof meta>;

const personas = [
  new Persona({
    id: '1',
    baulId: 'b1',
    email: 'yo@example.com',
    nickname: 'Yo',
    status: 'active',
    role: 'custodio',
    invitedDate: fixedStorybookDateIso,
    canEdit: true,
  }),
  new Persona({
    id: '2',
    baulId: 'b1',
    email: 'abuela@example.com',
    nickname: 'Abuela',
    status: 'active',
    role: 'colaborador',
    avatarUrl: storybookAvatars.abuela,
    invitedDate: fixedStorybookDateIso,
    canEdit: true,
  }),
  new Persona({
    id: '3',
    baulId: 'b1',
    email: 'tio@example.com',
    nickname: 'Tío Paco',
    status: 'pending',
    role: 'administrador',
    invitedDate: fixedStorybookDateIso,
    canEdit: true,
  }),
];

export const Default: Story = {
  args: {
    personas,
    currentUserEmail: 'yo@example.com',
    onSelectPersona: () => alert('onSelectPersona clicked'),
  },
};

export const Empty: Story = {
  args: {
    personas: [],
    onSelectPersona: () => alert('onSelectPersona clicked'),
  },
};
