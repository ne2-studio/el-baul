import type { Meta, StoryObj } from '@storybook/react-vite';
import { PersonaDetailScreen } from '@/features/people/components/PersonaDetailScreen';
import { Persona } from '@/types';
import { getPersonaPermissions } from '@/utils/roleUtils';

const meta = {
  title: 'Screens/Person/Detail',
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

const sharedDefaults = {
  onBack: () => alert('onBack clicked'),
  onEditInfo: () => alert('onEditInfo clicked'),
  onEditBiografia: () => alert('onEditBiografia clicked'),
  onUploadAvatar: () => alert('onUploadAvatar clicked'),
  onShareInvite: () => alert('onShareInvite clicked'),
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
