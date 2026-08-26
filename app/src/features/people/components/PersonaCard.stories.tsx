import type { Meta, StoryObj } from '@storybook/react-vite';
import { PersonaCard } from '@/features/people/components/PersonaCard';
import { Persona } from '@/types';
import { fixedStorybookDateIso, storybookAvatars, storybookEdgeText } from '@/storybook/fixtures';

const meta = {
  title: 'Features/People/PersonaCard',
  component: PersonaCard,
  tags: ['autodocs'],
} satisfies Meta<typeof PersonaCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const basePersona = new Persona({
  id: '1',
  baulId: 'b1',
  email: 'abuela@example.com',
  nickname: 'Abuela',
  status: 'active',
  role: 'colaborador',
  isCustodio: false,
  avatarUrl: storybookAvatars.abuela,
  invitedDate: fixedStorybookDateIso,
  canEdit: true,
});

export const Default: Story = {
  args: {
    persona: basePersona,
    onClick: () => alert('onClick'),
  },
};

export const Me: Story = {
  args: {
    ...Default.args,
    isMe: true,
  },
};

export const Custodio: Story = {
  args: {
    ...Default.args,
    persona: new Persona({
      id: '2',
      baulId: 'b1',
      email: 'yo@example.com',
      nickname: 'Yo',
      status: 'active',
      role: 'administrador',
      isCustodio: true,
      invitedDate: fixedStorybookDateIso,
      canEdit: true,
    }),
  },
};

export const Pending: Story = {
  args: {
    ...Default.args,
    persona: new Persona({
      id: '3',
      baulId: 'b1',
      nickname: 'Laura',
      status: 'pending',
      role: 'colaborador',
      isCustodio: false,
      invitedDate: fixedStorybookDateIso,
      canEdit: true,
    }),
  },
};

export const Muted: Story = {
  args: {
    ...Default.args,
    persona: new Persona({
      id: '5',
      baulId: 'b1',
      nickname: 'Primo lejano',
      status: 'pending',
      role: 'sin_acceso',
      isCustodio: false,
      invitedDate: fixedStorybookDateIso,
      canEdit: true,
    }),
    muted: true,
  },
};

export const LongNameWithoutAvatar: Story = {
  args: {
    ...Default.args,
    persona: new Persona({
      id: '4',
      baulId: 'b1',
      email: 'maria-del-carmen@example.com',
      nickname: storybookEdgeText.longPersonName,
      status: 'pending',
      role: 'colaborador',
      isCustodio: false,
      invitedDate: fixedStorybookDateIso,
      canEdit: true,
    }),
  },
};
