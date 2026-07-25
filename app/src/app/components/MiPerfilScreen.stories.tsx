import type { Meta, StoryObj } from '@storybook/react-vite';
import { MiPerfilScreen } from './MiPerfilScreen';

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
      photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
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
