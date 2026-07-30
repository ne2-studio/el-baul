import type { Meta, StoryObj } from '@storybook/react-vite';
import { BatchOperationProgress, BatchOperationItem, BatchOperationThumb } from '@/design-system/components/feedback/BatchOperationProgress';
import { storybookPhotos } from '@/storybook/fixtures';

const meta = {
  title: 'Components/Feedback/BatchOperationProgress',
  component: BatchOperationProgress,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Purpose
Full-screen progress feedback for batch operations that process photos item by item.

### When to use
Use while a batch action is actively running and the user needs confidence that each photo is progressing independently.

### When NOT to use
Do not use for background sync, single-photo operations, passive upload history or non-blocking status summaries.

### Typical examples
Moving selected photos to another chapter or applying a batch operation where some items can fail independently.

### Common mistakes
Rendering anonymous thumbnails without status, hiding partial failures, or replacing the blocking overlay with a toast while the operation is still in flight.
`,
      },
    },
  },
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

export const ThumbStates: Story = {
  args: {
    title: 'Moviendo fotos...',
    items: mixedItems,
  },
  parameters: {
    docs: {
      description: {
        story: `
### Purpose
\`BatchOperationThumb\` is the reusable thumbnail state primitive inside the batch overlay.

### When to use
Use when a photo-sized item needs pending, success or error state without duplicating status icon placement.

### When NOT to use
Do not use it as a selectable photo tile or generic gallery thumbnail; it is strictly progress feedback.
`,
      },
    },
  },
  render: () => (
    <div className="grid w-72 grid-cols-3 gap-3">
      <BatchOperationThumb thumbnailUrl={storybookPhotos.beach} status="pending" />
      <BatchOperationThumb thumbnailUrl={storybookPhotos.album} status="success" />
      <BatchOperationThumb thumbnailUrl={storybookPhotos.sunset} status="error" />
    </div>
  ),
};
