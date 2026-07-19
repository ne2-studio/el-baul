import type { Meta, StoryObj } from '@storybook/react-vite';
import { ImageIcon } from 'lucide-react';
import { EmptyState } from './EmptyState';

const meta = {
  title: 'Components/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Sin fotos todavía',
    subtitle: 'Sube tus primeros recuerdos para empezar a llenar este baúl.',
  },
};

export const WithIcon: Story = {
  args: {
    title: 'Sin fotos todavía',
    subtitle: 'Sube tus primeros recuerdos para empezar a llenar este baúl.',
    icon: <ImageIcon className="w-12 h-12" />,
  },
};
