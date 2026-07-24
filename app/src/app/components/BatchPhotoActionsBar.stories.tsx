import type { Meta, StoryObj } from '@storybook/react-vite';
import { BatchPhotoActionsBar } from './BatchPhotoActionsBar';
import { Photo } from './PhotosView';
import { Chapter } from './ChaptersView';

const meta = {
  title: 'Components/BatchPhotoActionsBar',
  component: BatchPhotoActionsBar,
  tags: ['autodocs'],
} satisfies Meta<typeof BatchPhotoActionsBar>;

export default meta;
type Story = StoryObj<typeof meta>;

const photos: Photo[] = [
  {
    id: 'p1',
    thumbnailUrl: 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=300',
    fullUrl: 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=1200',
  },
  {
    id: 'p2',
    thumbnailUrl: 'https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?w=300',
    fullUrl: 'https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?w=1200',
  },
];

const moveableChapters: Chapter[] = [
  { id: 'c1', name: 'Verano 2023', photoCount: 42 },
  { id: 'c2', name: 'Navidad', photoCount: 30 },
];

// Simulates one settle-per-photo, like the real batch-move request, so the progress
// overlay's per-item checkmarks are visible when driving the story interactively.
const onBatchMove = async (
  ids: string[],
  _targetChapterId: string,
  onItemSettled?: (result: { photoId: string; error?: string }) => void
) => {
  for (const id of ids) {
    await new Promise((r) => setTimeout(r, 400));
    onItemSettled?.({ photoId: id });
  }
};

export const Default: Story = {
  args: {
    active: true,
    photos,
    selectedIds: new Set(photos.map((p) => p.id)),
    moveableChapters,
    onBatchMove,
    onBatchChangeDate: async (ids, date) => { alert(`onBatchChangeDate: ${ids.length} fotos, ${JSON.stringify(date)}`); return true; },
    onBatchCreateChapter: async (ids, name) => { alert(`onBatchCreateChapter: ${ids.length} fotos -> "${name}"`); return true; },
    onDone: () => alert('onDone called'),
  },
};

// Only "Mover" is offered when the caller doesn't support changing dates or creating
// chapters in bulk (e.g. onBatchChangeDate/onBatchCreateChapter are optional props).
export const MoveOnly: Story = {
  args: {
    ...Default.args,
    onBatchChangeDate: undefined,
    onBatchCreateChapter: undefined,
  },
};

// Nothing renders once selectionMode exits or the selection is empty — the bar and its
// modals are entirely gated on `active` + a non-empty selection.
export const Inactive: Story = {
  args: {
    ...Default.args,
    active: false,
  },
};
