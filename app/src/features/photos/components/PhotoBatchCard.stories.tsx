import type { Meta, StoryObj } from '@storybook/react-vite';
import { PhotoBatchCard } from '@/features/photos/components/PhotoBatchCard';
import { PhotoBatch } from '@/types';
import { storybookPhotos } from '@/storybook/fixtures';

const meta = {
  title: 'Features/Photos/PhotoBatchCard',
  component: PhotoBatchCard,
  tags: ['autodocs'],
} satisfies Meta<typeof PhotoBatchCard>;

export default meta;
type Story = StoryObj<typeof meta>;

function previewPhoto(id: string, thumbnailUrl: string) {
  return {
    id, baulId: 'baul-1', thumbnailUrl, fullUrl: thumbnailUrl, uploadedBy: 'user-1', createdAt: new Date().toISOString(), recuerdoCount: 0,
    canDelete: false, canRequestRemoval: true,
  };
}

const fourPreviews = [
  previewPhoto('p1', storybookPhotos.beach),
  previewPhoto('p2', storybookPhotos.people),
  previewPhoto('p3', storybookPhotos.beach),
  previewPhoto('p4', storybookPhotos.people),
];

const baseBatchDto: ConstructorParameters<typeof PhotoBatch>[0] = {
  batchId: 'batch-1',
  userId: 'user-1',
  userName: 'Tita Loli',
  personaId: 'persona-1',
  photoCount: 2,
  createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  previewPhotos: fourPreviews.slice(0, 2),
};

export const Default: Story = {
  args: {
    photoBatch: new PhotoBatch(baseBatchDto),
    onUserClick: (id) => alert(`onUserClick: ${id}`),
    onOpenPhoto: (photo) => alert(`onOpenPhoto: ${photo.id}`),
    onOpenGrid: () => alert('onOpenGrid'),
  },
};

export const WithMorePhotos: Story = {
  args: {
    ...Default.args,
    photoBatch: new PhotoBatch({ ...baseBatchDto, photoCount: 12, previewPhotos: fourPreviews }),
  },
};

export const SinglePhoto: Story = {
  args: {
    ...Default.args,
    photoBatch: new PhotoBatch({ ...baseBatchDto, photoCount: 1, previewPhotos: fourPreviews.slice(0, 1) }),
  },
};

export const WithChapter: Story = {
  args: {
    ...Default.args,
    onChapterClick: (id) => alert(`onChapterClick: ${id}`),
    photoBatch: new PhotoBatch({ ...baseBatchDto, chapterId: 'chapter-1', chapterName: 'Verano 2024' }),
  },
};
