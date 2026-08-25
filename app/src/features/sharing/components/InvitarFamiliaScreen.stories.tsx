import type { Meta, StoryObj } from '@storybook/react-vite';
import { InvitarFamiliaScreen } from '@/features/sharing/components/InvitarFamiliaScreen';
import { Persona } from '@/types';
import { fixedStorybookDateIso, storybookAvatars } from '@/storybook/fixtures';

const meta = {
  title: 'Screens/Sharing/InvitarFamilia',
  component: InvitarFamiliaScreen,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof InvitarFamiliaScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

const personas: Persona[] = [
  new Persona({
    id: '1',
    baulId: 'b1',
    nickname: 'Abuela',
    name: 'María López',
    avatarUrl: storybookAvatars.abuela,
    status: 'pending',
    role: 'colaborador',
    isCustodio: false,
    invitedDate: fixedStorybookDateIso,
    canEdit: false,
  }),
  new Persona({
    id: '2',
    baulId: 'b1',
    nickname: 'Tío Juan',
    status: 'pending',
    role: 'colaborador',
    isCustodio: false,
    invitedDate: fixedStorybookDateIso,
    canEdit: false,
  }),
  new Persona({
    id: '3',
    baulId: 'b1',
    email: 'yo@example.com',
    nickname: 'Yo',
    status: 'active',
    role: 'administrador',
    isCustodio: true,
    invitedDate: fixedStorybookDateIso,
    canEdit: true,
  }),
];

export const Default: Story = {
  args: {
    baulNombre: 'Familia García',
    personas,
    invitingPersonaId: null,
    onInvite: (persona) => alert(`onInvite: ${persona.nickname}`),
    onAddPersona: () => alert('onAddPersona clicked'),
    onBack: () => alert('onBack clicked'),
  },
};

export const Inviting: Story = {
  args: {
    ...Default.args,
    invitingPersonaId: '1',
  },
};
