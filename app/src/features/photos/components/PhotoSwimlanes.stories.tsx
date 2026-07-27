import type { Meta, StoryObj } from '@storybook/react-vite';
import { PhotoSwimlanes } from '@/features/photos/components/PhotoSwimlanes';
import { Photo } from '@/types';

const meta = {
  title: 'Features/Photos/PhotoSwimlanes',
  component: PhotoSwimlanes,
  tags: ['autodocs'],
} satisfies Meta<typeof PhotoSwimlanes>;

export default meta;
type Story = StoryObj<typeof meta>;

const photos: Photo[] = [
  { id: '1', thumbnailUrl: 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=300', fullUrl: '', date: { year: 2024, month: 7, day: 15 }, recuerdoCount: 0 },
  { id: '2', thumbnailUrl: 'https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?w=300', fullUrl: '', date: { year: 2024, month: 7, day: 20 }, recuerdoCount: 0 },
  { id: '3', thumbnailUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300', fullUrl: '', date: { year: 2024, month: 12 }, recuerdoCount: 0 },
  { id: '4', thumbnailUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=300', fullUrl: '', date: { year: 2023 }, recuerdoCount: 0 },
  { id: '5', thumbnailUrl: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=300', fullUrl: '', recuerdoCount: 0 },
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
