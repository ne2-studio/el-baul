import type { Meta, StoryObj } from '@storybook/react-vite';
import { PhotosView } from '@/features/chapters/components/PhotosView';
import { Chapter, Photo, Recuerdo } from '@/types';
import { storybookPhotos } from '@/storybook/fixtures';

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
  lastUpdated: 'hace 2 días',
  recuerdoCount: 1,
  undatedPhotoCount: 0,
  coverPhotoUrl: storybookPhotos.familyCover,
  minDate: { year: 2024, month: 7 },
  maxDate: { year: 2024, month: 8 },
};

const photos: Photo[] = [
  { id: '1', thumbnailUrl: storybookPhotos.beach, fullUrl: storybookPhotos.beach, date: { year: 2024, month: 7, day: 15 }, recuerdoCount: 2 },
  { id: '2', thumbnailUrl: storybookPhotos.album, fullUrl: storybookPhotos.album, date: { year: 2024, month: 7, day: 20 }, recuerdoCount: 0 },
  { id: '3', thumbnailUrl: storybookPhotos.sunset, fullUrl: storybookPhotos.sunset, date: { year: 2024, month: 8, day: 2 }, recuerdoCount: 0 },
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
