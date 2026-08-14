import type { Meta, StoryObj } from '@storybook/react-vite';
import { BatchPhotoActionsBar } from '@/features/photos/components/BatchPhotoActionsBar';
import { Chapter, Photo } from '@/types';
import { storybookPhotos } from '@/storybook/fixtures';

const meta = {
  title: 'Features/Photos/BatchPhotoActionsBar',
  component: BatchPhotoActionsBar,
  tags: ['autodocs'],
} satisfies Meta<typeof BatchPhotoActionsBar>;

export default meta;
type Story = StoryObj<typeof meta>;

const photos: Photo[] = [
  {
    id: 'p1',
    thumbnailUrl: storybookPhotos.beach,
    fullUrl: storybookPhotos.beach,
    date: { year: 2023, month: 7 },
    recuerdoCount: 0,
    canDelete: false,
    canRequestRemoval: true,
  },
  {
    id: 'p2',
    thumbnailUrl: storybookPhotos.album,
    fullUrl: storybookPhotos.album,
    recuerdoCount: 0,
    canDelete: false,
    canRequestRemoval: true,
  },
];

const moveableChapters: Chapter[] = [
  { id: 'c1', name: 'Verano 2023', photoCount: 42, lastUpdated: 'hace 1 día', recuerdoCount: 0, undatedPhotoCount: 0 },
  { id: 'c2', name: 'Navidad', photoCount: 30, lastUpdated: 'hace 2 días', recuerdoCount: 0, undatedPhotoCount: 0 },
];

// Simulates one settle-per-photo, like the real batch-move request, so the progress
// overlay's per-item checkmarks are visible when driving the story interactively.
const onBatchMove = async (
  ids: string[],
  _targetChapterId: string,
  onItemSettled?: (result: { photoId: string; error?: string }) => void
) => {
  for (const id of ids) {
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
    onBatchClearDate: async (ids) => { alert(`onBatchClearDate: ${ids.length} fotos`); return true; },
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
