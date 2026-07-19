import type { Meta, StoryObj } from '@storybook/react-vite';
import { BatchOperationProgress, BatchOperationItem } from './BatchOperationProgress';

const meta = {
  title: 'Components/BatchOperationProgress',
  component: BatchOperationProgress,
  tags: ['autodocs'],
} satisfies Meta<typeof BatchOperationProgress>;

export default meta;
type Story = StoryObj<typeof meta>;

const photoUrls = [
  'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=300',
  'https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?w=300',
  'https://images.unsplash.com/photo-1518481612222-68bbe828ecd1?w=300',
  'https://images.unsplash.com/photo-1476234251651-f353703a034d?w=300',
  'https://images.unsplash.com/photo-1465101162946-4377e57745c3?w=300',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=300',
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
