import type { Meta, StoryObj } from '@storybook/react-vite';
import { PersonasTab } from '@/features/people/components/PersonasTab';
import { Persona } from '@/types';
import { fixedStorybookDateIso, storybookAvatars, storybookEdgeText } from '@/storybook/fixtures';

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

export const LongNamesPendingAndMissingAvatars: Story = {
  args: {
    personas: [
      new Persona({
        id: 'edge-1',
        baulId: 'b1',
        email: 'maria-del-carmen.garcia-lopez-de-la-fuente@example.com',
        nickname: storybookEdgeText.longPersonName,
        status: 'active',
        role: 'custodio',
        invitedDate: fixedStorybookDateIso,
        canEdit: true,
      }),
      new Persona({
        id: 'edge-2',
        baulId: 'b1',
        email: 'pendiente.sin.avatar@example.com',
        nickname: 'Pendiente sin avatar',
        status: 'pending',
        role: 'colaborador',
        invitedDate: fixedStorybookDateIso,
        canEdit: true,
      }),
      ...Array.from({ length: 10 }, (_, index) => new Persona({
        id: `edge-${index + 3}`,
        baulId: 'b1',
        email: `familiar-${index + 1}@example.com`,
        nickname: index % 3 === 0 ? `Familiar con nombre largo ${index + 1} de la rama de Valencia` : `Familiar ${index + 1}`,
        status: index % 4 === 0 ? 'pending' : 'active',
        role: index % 5 === 0 ? 'administrador' : 'colaborador',
        avatarUrl: index % 2 === 0 ? storybookAvatars.abuela : undefined,
        invitedDate: fixedStorybookDateIso,
        canEdit: true,
      })),
    ],
    currentUserEmail: 'maria-del-carmen.garcia-lopez-de-la-fuente@example.com',
    onSelectPersona: () => alert('onSelectPersona clicked'),
  },
};
