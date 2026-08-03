import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { PersonaDetailScreen } from '@/features/people/components/PersonaDetailScreen';
import { Persona } from '@/types';
import { getPersonaPermissions } from '@/utils/roleUtils';

const meta = {
  title: 'Screens/Person/PersonaDetail',
  component: PersonaDetailScreen,
  tags: ['autodocs'],
} satisfies Meta<typeof PersonaDetailScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

const activePersona: Persona = {
  id: '1',
  baulId: 'baul-1',
  name: 'María López',
  nickname: 'Abuela',
  status: 'active',
  role: 'colaborador',
  invitedDate: 'hace 2 meses',
  canEdit: true,
};

const pendingPersona: Persona = {
  ...activePersona,
  id: '2',
  status: 'pending',
};

const noAccessPersona: Persona = {
  ...activePersona,
  id: '3',
  status: 'sin_acceso',
  role: 'sin_acceso',
  canEdit: true,
};

const sharedDefaults = {
  onBack: () => alert('onBack clicked'),
  onEditInfo: () => alert('onEditInfo clicked'),
  onEditBiografia: () => alert('onEditBiografia clicked'),
  onChangeAvatar: () => alert('onChangeAvatar clicked'),
  onChangeRole: () => alert('onChangeRole clicked'),
  onRevokeAccess: async () => true,
  photos: [],
  onSelectPhoto: () => alert('onSelectPhoto clicked'),
};

export const Default: Story = {
  args: {
    ...sharedDefaults,
    persona: activePersona,
    permissions: getPersonaPermissions({ currentBaulRole: 'custodio', persona: activePersona }),
  },
};

export const PendingInvite: Story = {
  args: {
    ...sharedDefaults,
    persona: pendingPersona,
    permissions: getPersonaPermissions({ currentBaulRole: 'custodio', persona: pendingPersona }),
  },
};

export const NonAdminView: Story = {
  args: {
    ...sharedDefaults,
    persona: activePersona,
    permissions: getPersonaPermissions({ currentBaulRole: 'colaborador', persona: activePersona }),
  },
};

export const NoAccess: Story = {
  args: {
    ...sharedDefaults,
    persona: noAccessPersona,
    permissions: getPersonaPermissions({ currentBaulRole: 'custodio', persona: noAccessPersona }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Sin acceso')).toBeVisible();
    await expect(canvas.getByText('Forma parte de la historia familiar, pero no puede ver ni colaborar en el contenido.')).toBeVisible();

    await userEvent.click(canvas.getByRole('button', { name: 'Opciones de la persona' }));
    const body = within(document.body);
    await expect(body.getByRole('menuitem', { name: 'Permitir invitación' })).toBeVisible();
    await expect(body.queryByRole('menuitem', { name: 'Gestionar acceso' })).not.toBeInTheDocument();
    await expect(body.queryByRole('menuitem', { name: 'Revocar acceso' })).not.toBeInTheDocument();
  },
};
