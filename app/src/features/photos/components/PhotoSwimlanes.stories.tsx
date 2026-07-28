import type { Meta, StoryObj } from '@storybook/react-vite';
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
  { id: '1', thumbnailUrl: storybookPhotos.beach, fullUrl: storybookPhotos.beach, date: { year: 2024, month: 7, day: 15 }, recuerdoCount: 0 },
  { id: '2', thumbnailUrl: storybookPhotos.album, fullUrl: storybookPhotos.album, date: { year: 2024, month: 7, day: 20 }, recuerdoCount: 0 },
  { id: '3', thumbnailUrl: storybookPhotos.sunset, fullUrl: storybookPhotos.sunset, date: { year: 2024, month: 12 }, recuerdoCount: 0 },
  { id: '4', thumbnailUrl: storybookPhotos.people, fullUrl: storybookPhotos.people, date: { year: 2023 }, recuerdoCount: 0 },
  { id: '5', thumbnailUrl: storybookPhotos.landscape, fullUrl: storybookPhotos.landscape, recuerdoCount: 0 },
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
