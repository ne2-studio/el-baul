import type { Meta, StoryObj } from '@storybook/react-vite';
import { CoverPhotoPickerModal } from '@/features/photos/components/CoverPhotoPickerModal';
import { Photo } from '@/features/chapters/components/PhotosView';

function makePhotos(count: number, offset = 0): Photo[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `photo-${offset + i}`,
    thumbnailUrl: `https://picsum.photos/seed/${offset + i}/300/300`,
    fullUrl: `https://picsum.photos/seed/${offset + i}/1200/1200`,
  }));
}

const meta = {
  title: 'Features/Photos/CoverPhotoPickerModal',
  component: CoverPhotoPickerModal,
  tags: ['autodocs'],
} satisfies Meta<typeof CoverPhotoPickerModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Elegir portada del baúl',
    fetchPage: async (skip, take) => ({
      photos: makePhotos(Math.min(take, 24 - skip), skip),
      hasMore: skip + take < 24,
    }),
    onSelect: (photo) => alert(`onSelect: ${photo.id}`),
    onCancel: () => alert('onCancel clicked'),
  },
};

export const Empty: Story = {
  args: {
    title: 'Elegir portada del capítulo',
    fetchPage: async () => ({ photos: [], hasMore: false }),
    onSelect: (photo) => alert(`onSelect: ${photo.id}`),
    onCancel: () => alert('onCancel clicked'),
  },
};

export const Loading: Story = {
  args: {
    title: 'Elegir portada del baúl',
    fetchPage: () => new Promise(() => {}),
    onSelect: (photo) => alert(`onSelect: ${photo.id}`),
    onCancel: () => alert('onCancel clicked'),
  },
};
