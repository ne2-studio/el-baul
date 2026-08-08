import type { Meta, StoryObj } from '@storybook/react-vite';
import { FeedTab } from '@/features/memories/components/FeedTab';
import { FeedItem, PhotoBatch, Recuerdo } from '@/types';
import { storybookPhotos } from '@/storybook/fixtures';

const meta = {
  title: 'Features/Memories/FeedTab',
  component: FeedTab,
  tags: ['autodocs'],
} satisfies Meta<typeof FeedTab>;

export default meta;
type Story = StoryObj<typeof meta>;

const recuerdoItem: FeedItem = {
  type: 'recuerdo',
  createdAt: '2024-07-16T10:00:00Z',
  recuerdo: {
    id: '1',
    text: '¡Qué día tan bonito! No me acordaba de que hacía tanto calor ese verano.',
    userName: 'Ana García',
    personaId: 'p1',
    createdAt: '2024-07-16T10:00:00Z',
  } as Recuerdo,
};

const photoBatchItem: FeedItem = {
  type: 'photo_batch',
  createdAt: '2024-07-15T10:00:00Z',
  photoBatch: new PhotoBatch({
    batchId: 'batch-1',
    userId: 'user-1',
    userName: 'Tita Loli',
    personaId: 'p2',
    photoCount: 8,
    chapterId: 'c1',
    chapterName: 'Verano 2024',
    createdAt: '2024-07-15T10:00:00Z',
    previewPhotos: [
      { id: 'p1', baulId: 'b1', thumbnailUrl: storybookPhotos.beach, fullUrl: storybookPhotos.beach, uploadedBy: 'user-1', createdAt: '2024-07-15T10:00:00Z', recuerdoCount: 0 },
      { id: 'p2', baulId: 'b1', thumbnailUrl: storybookPhotos.people, fullUrl: storybookPhotos.people, uploadedBy: 'user-1', createdAt: '2024-07-15T10:00:00Z', recuerdoCount: 0 },
    ],
  }),
};

export const Default: Story = {
  args: {
    feedItems: [recuerdoItem, photoBatchItem],
    onOpenChapter: (id) => alert(`onOpenChapter: ${id}`),
    onOpenPhoto: (id) => alert(`onOpenPhoto: ${id}`),
    onUserClick: (id) => alert(`onUserClick: ${id}`),
    onOpenBatchPhoto: (batch, photo) => alert(`onOpenBatchPhoto: ${batch.batchId} / ${photo.id}`),
    onOpenBatchGrid: (batch) => alert(`onOpenBatchGrid: ${batch.batchId}`),
  },
};

export const OnlyRecuerdos: Story = {
  args: {
    ...Default.args,
    feedItems: [recuerdoItem],
  },
};

export const Empty: Story = {
  args: {
    ...Default.args,
    feedItems: [],
  },
};
