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
      role: 'custodio',
      invitedDate: fixedStorybookDateIso,
      canEdit: true,
    }),
  },
};

export const WithoutAccess: Story = {
  args: {
    ...Default.args,
    persona: new Persona({
      id: '3',
      baulId: 'b1',
      nickname: 'Laura',
      status: 'sin_acceso',
      role: 'sin_acceso',
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
      invitedDate: fixedStorybookDateIso,
      canEdit: true,
    }),
  },
};
