import type { Meta, StoryObj } from '@storybook/react-vite';
import { InvitacionScreen } from '@/features/sharing/components/InvitacionScreen';
import { storybookPhotos } from '@/storybook/fixtures';

const meta = {
  title: 'Screens/Onboarding/Invitacion',
  component: InvitacionScreen,
  tags: ['autodocs'],
} satisfies Meta<typeof InvitacionScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

const previewPhotos = [
  storybookPhotos.familyCover,
  storybookPhotos.beach,
  storybookPhotos.album,
  storybookPhotos.people,
];

export const Default: Story = {
  args: {
    baulNombre: 'Familia García',
    previewPhotos,
    onContinuar: () => alert('onContinuar clicked'),
  },
};

export const SinPreview: Story = {
  args: {
    baulNombre: 'Familia García',
    previewPhotos: [],
    onContinuar: () => alert('onContinuar clicked'),
  },
};
