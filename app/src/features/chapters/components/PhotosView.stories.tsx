import type { Meta, StoryObj } from '@storybook/react-vite';
import { PhotosView, Photo, Recuerdo } from '@/features/chapters/components/PhotosView';
import { Chapter } from '@/features/baules/components/ChaptersView';

const meta = {
  title: 'Screens/Chapter/Detail',
  component: PhotosView,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof PhotosView>;

export default meta;
type Story = StoryObj<typeof meta>;

const chapter: Chapter = {
  id: 'c1',
  name: 'Verano 2024',
  photoCount: 3,
  coverPhotoUrl: 'https://images.unsplash.com/photo-1476703993599-0035a21b17a9?w=1200',
  minDate: { year: 2024, month: 7 },
  maxDate: { year: 2024, month: 8 },
};

const photos: Photo[] = [
  { id: '1', thumbnailUrl: 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=300', fullUrl: '', date: { year: 2024, month: 7, day: 15 }, recuerdoCount: 2 },
  { id: '2', thumbnailUrl: 'https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?w=300', fullUrl: '', date: { year: 2024, month: 7, day: 20 } },
  { id: '3', thumbnailUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300', fullUrl: '', date: { year: 2024, month: 8, day: 2 } },
];

const recuerdos: Recuerdo[] = [
  { id: 'r1', text: 'Un verano inolvidable.', userName: 'Ana García', createdAt: '2024-07-15T10:00:00Z' },
];

const sharedDefaults = {
  chapter,
  photos,
  onBack: () => alert('onBack clicked'),
  onSelectPhoto: (photo: Photo) => alert(`onSelectPhoto: ${photo.id}`),
  onAddPhotos: () => alert('onAddPhotos clicked'),
  onUpdateChapterInfo: async () => true,
  onDeleteChapter: async () => true,
  onAddRecuerdo: (text: string) => alert(`onAddRecuerdo: ${text}`),
  recuerdos,
};

export const Default: Story = {
  args: sharedDefaults,
};

export const Empty: Story = {
  args: {
    ...sharedDefaults,
    photos: [],
  },
};

export const ReadOnlyLoosePhotos: Story = {
  args: {
    ...sharedDefaults,
    onUpdateChapterInfo: undefined,
    onDeleteChapter: undefined,
    onAddRecuerdo: undefined,
    recuerdos: [],
  },
};
