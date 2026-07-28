import type { Meta, StoryObj } from '@storybook/react-vite';
import { BatchOperationProgress, BatchOperationItem } from '@/design-system/components/feedback/BatchOperationProgress';
import { storybookPhotos } from '@/storybook/fixtures';

const meta = {
  title: 'Components/Feedback/BatchOperationProgress',
  component: BatchOperationProgress,
  tags: ['autodocs'],
} satisfies Meta<typeof BatchOperationProgress>;

export default meta;
type Story = StoryObj<typeof meta>;

const photoUrls = [
  storybookPhotos.familyCover,
  storybookPhotos.beach,
  storybookPhotos.album,
  storybookPhotos.sunset,
  storybookPhotos.people,
  storybookPhotos.landscape,
];

const mixedItems: BatchOperationItem[] = photoUrls.map((thumbnailUrl, i) => ({
  id: String(i),
  thumbnailUrl,
  status: i < 3 ? 'success' : i === 3 ? 'error' : 'pending',
}));

export const InProgress: Story = {
  args: {
    title: 'Moviendo fotos...',
    items: mixedItems,
  },
};

export const AllSucceeded: Story = {
  args: {
    title: 'Moviendo fotos...',
    items: photoUrls.map((thumbnailUrl, i) => ({ id: String(i), thumbnailUrl, status: 'success' as const })),
  },
};
