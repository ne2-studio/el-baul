import type { Meta, StoryObj } from '@storybook/react-vite';
import { MiPerfilScreen } from '@/features/profile/components/MiPerfilScreen';
import { storybookAvatars } from '@/storybook/fixtures';

const meta = {
  title: 'Screens/Profile/MiPerfil',
  component: MiPerfilScreen,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof MiPerfilScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onBack: () => alert('onBack clicked'),
    userProfile: {
      name: 'Ana García',
      email: 'ana.garcia@example.com',
      photoUrl: storybookAvatars.abuela,
    },
  },
};

export const WithoutPhoto: Story = {
  args: {
    ...Default.args,
    userProfile: {
      name: 'Ana García',
      email: 'ana.garcia@example.com',
    },
  },
};
