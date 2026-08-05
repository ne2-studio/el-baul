import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { PersonaDetailScreen } from '@/features/people/components/PersonaDetailScreen';
import { Persona } from '@/types';
import { getPersonaPermissions } from '@/utils/roleUtils';

// The "···" settings menu (edit info, avatar, manage access, revoke) moved into
// PersonaSettingsMenuContainer (features/people/containers) — a self-sufficient component
// that reads its own Zustand store slice, so it can no longer render meaningfully from props
// alone in isolation here (no baúl/role seeded, it renders nothing in its trailing slot).
// Its behavior is covered by PersonaSettingsMenuContainer.test.tsx, and end to end by
// app/acceptance-tests/personas.spec.ts. This story now only exercises what
// PersonaDetailScreen still owns directly: the hero, biografia/fotos tabs, and the
// "Editar biografía" FAB.
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
  baulId: 'baul-1',
  onBack: () => alert('onBack clicked'),
  onEditBiografia: () => alert('onEditBiografia clicked'),
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
  },
};
