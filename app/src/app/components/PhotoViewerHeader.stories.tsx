import type { Meta, StoryObj } from '@storybook/react-vite';
import { BookImage, Calendar, FolderInput, Trash2 } from 'lucide-react';
import { PhotoViewerHeader } from './PhotoViewerHeader';

const meta = {
  title: 'Components/PhotoViewerHeader',
  component: PhotoViewerHeader,
  tags: ['autodocs'],
  decorators: [(Story) => <div className="bg-foreground p-8"><Story /></div>],
} satisfies Meta<typeof PhotoViewerHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoActions: Story = {
  args: {
    currentIndex: 0,
    totalCount: 12,
    onClose: () => alert('onClose clicked'),
    menuItems: [],
  },
};

export const WithActions: Story = {
  args: {
    currentIndex: 3,
    totalCount: 12,
    onClose: () => alert('onClose clicked'),
    menuItems: [
      { key: 'album-cover', label: 'Establecer como portada del capítulo', icon: BookImage, onSelect: () => alert('Establecer como portada del capítulo clicked') },
      { key: 'move', label: 'Mover a otro capítulo', icon: FolderInput, onSelect: () => alert('Mover a otro capítulo clicked') },
      { key: 'date', label: 'Cambiar fecha', icon: Calendar, onSelect: () => alert('Cambiar fecha clicked') },
    ],
  },
};

export const WithDestructiveAction: Story = {
  args: {
    currentIndex: 3,
    totalCount: 12,
    onClose: () => alert('onClose clicked'),
    menuItems: [
      { key: 'date', label: 'Cambiar fecha', icon: Calendar, onSelect: () => alert('Cambiar fecha clicked') },
      { key: 'delete', label: 'Retirar foto', icon: Trash2, onSelect: () => alert('Retirar foto clicked'), variant: 'destructive' },
    ],
  },
};
