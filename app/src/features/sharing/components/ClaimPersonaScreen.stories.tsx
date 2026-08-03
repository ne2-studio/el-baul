import type { Meta, StoryObj } from '@storybook/react-vite';
import { ClaimPersonaScreen } from '@/features/sharing/components/ClaimPersonaScreen';
import { ClaimablePersona } from '@/types';
import { storybookAvatars } from '@/storybook/fixtures';

const meta = {
  title: 'Screens/Sharing/ClaimPersona',
  component: ClaimPersonaScreen,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof ClaimPersonaScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

const personas: ClaimablePersona[] = [
  { id: '1', nickname: 'Abuela', name: 'María López', avatarUrl: storybookAvatars.abuela } as ClaimablePersona,
  { id: '2', nickname: 'Tío Juan' } as ClaimablePersona,
];

export const Default: Story = {
  args: {
    baulNombre: 'Familia García',
    personas,
    onSelectPersona: (persona) => alert(`onSelectPersona: ${persona.nickname}`),
    onNotListed: () => alert('onNotListed clicked'),
    onCancel: () => alert('onCancel clicked'),
  },
};

export const SinNombre: Story = {
  args: {
    ...Default.args,
    personas: [{ id: '2', nickname: 'Tío Juan' } as ClaimablePersona],
  },
};

export const Submitting: Story = {
  args: {
    ...Default.args,
    isSubmitting: true,
  },
};
