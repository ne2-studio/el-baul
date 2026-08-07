import type { Meta, StoryObj } from '@storybook/react-vite';
import { FullScreenLoading } from '@/design-system/components/feedback/FullScreenLoading';

const meta = {
  title: 'Design System/Feedback/FullScreenLoading',
  component: FullScreenLoading,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof FullScreenLoading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    message: 'Abriendo baúl...',
  },
};

export const PreparandoBaules: Story = {
  args: {
    message: 'Preparando tus baúles…',
  },
};

export const CargandoFoto: Story = {
  args: {
    message: 'Cargando foto...',
  },
};
