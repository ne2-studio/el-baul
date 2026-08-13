import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { PhotoSwimlanes } from '@/features/photos/components/PhotoSwimlanes';
import { Photo } from '@/types';
import { storybookPhotos } from '@/storybook/fixtures';

const meta = {
  title: 'Features/Photos/PhotoSwimlanes',
  component: PhotoSwimlanes,
  tags: ['autodocs'],
} satisfies Meta<typeof PhotoSwimlanes>;

export default meta;
type Story = StoryObj<typeof meta>;

const photos: Photo[] = [
  { id: '1', thumbnailUrl: storybookPhotos.beach, fullUrl: storybookPhotos.beach, date: { year: 2024, month: 7, day: 15 }, recuerdoCount: 0, canDelete: false, canRequestRemoval: true },
  { id: '2', thumbnailUrl: storybookPhotos.album, fullUrl: storybookPhotos.album, date: { year: 2024, month: 7, day: 20 }, recuerdoCount: 0, canDelete: false, canRequestRemoval: true },
  { id: '3', thumbnailUrl: storybookPhotos.sunset, fullUrl: storybookPhotos.sunset, date: { year: 2024, month: 12 }, recuerdoCount: 0, canDelete: false, canRequestRemoval: true },
  { id: '4', thumbnailUrl: storybookPhotos.people, fullUrl: storybookPhotos.people, date: { year: 2023 }, recuerdoCount: 0, canDelete: false, canRequestRemoval: true },
  { id: '5', thumbnailUrl: storybookPhotos.landscape, fullUrl: storybookPhotos.landscape, recuerdoCount: 0, canDelete: false, canRequestRemoval: true },
];

export const Default: Story = {
  args: {
    photos,
    onSelectPhoto: (photo) => alert(`onSelectPhoto: ${photo.id}`),
  },
};

export const SelectionMode: Story = {
  args: {
    ...Default.args,
    selectionMode: true,
    selectedIds: new Set(['1', '3']),
    onToggleSelect: (id) => alert(`onToggleSelect: ${id}`),
    onToggleGroup: (groupPhotos) => alert(`onToggleGroup: ${groupPhotos.length} fotos`),
  },
};

// The photo just uploaded (id '1') is pinned in its own swimlane above the date groups —
// and still shows in its normal July 2024 group too, since this is a "just added" shelf,
// not a filter (see ChapterRoute/PhotosView, which populate this from router state right
// after an upload).
export const RecentlyAdded: Story = {
  args: {
    ...Default.args,
    recentlyAddedPhotos: [photos[0]],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Añadido recientemente')).toBeInTheDocument();
    await expect(canvas.getAllByRole('img', { name: 'Foto' })).toHaveLength(photos.length + 1);
  },
};

export const DenseMixedDatesAndMissingMetadata: Story = {
  args: {
    ...Default.args,
    photos: Array.from({ length: 24 }, (_, index) => {
      const urls = Object.values(storybookPhotos);
      const date =
        index % 5 === 0 ? undefined :
        index % 5 === 1 ? { year: 2024 } :
        index % 5 === 2 ? { year: 2024, month: 7 } :
        { year: 2024, month: 7, day: (index % 28) + 1 };
      return {
        id: `dense-${index + 1}`,
        thumbnailUrl: urls[index % urls.length],
        fullUrl: urls[index % urls.length],
        date,
        recuerdoCount: index % 4,
      } as Photo;
    }),
  },
};
