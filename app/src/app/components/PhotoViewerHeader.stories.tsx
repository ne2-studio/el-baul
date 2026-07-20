import type { Meta, StoryObj } from '@storybook/react-vite';
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
    onClose: () => {},
    menuItems: [],
  },
};

export const WithActions: Story = {
  args: {
    currentIndex: 3,
    totalCount: 12,
    onClose: () => {},
    menuItems: [
      { key: 'album-cover', label: 'Establecer como portada del capítulo', onSelect: () => {} },
      { key: 'move', label: 'Mover a otro capítulo', onSelect: () => {} },
      { key: 'date', label: 'Cambiar fecha', onSelect: () => {} },
    ],
  },
};

export const WithDestructiveAction: Story = {
  args: {
    currentIndex: 3,
    totalCount: 12,
    onClose: () => {},
    menuItems: [
      { key: 'date', label: 'Cambiar fecha', onSelect: () => {} },
      { key: 'delete', label: 'Retirar foto', onSelect: () => {}, variant: 'destructive' },
    ],
  },
};
