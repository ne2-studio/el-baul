import type { Meta, StoryObj } from '@storybook/react-vite';
import { PhotosView } from '@/features/chapters/components/PhotosView';
import { Chapter, Photo } from '@/types';
import { storybookPhotos } from '@/storybook/fixtures';
import { withRouter } from '@/storybook/withRouter';

// Recuerdos feed, multi-select batch actions, and the chapter settings "···" menu moved into
// ChapterRecuerdosFeedContainer/BatchPhotoActionsContainer/ChapterSettingsMenuContainer
// (features/memories, features/photos, features/chapters) — self-sufficient components that
// read their own Zustand store slice, own their use cases, and self-navigate, so this story
// needs a bare MemoryRouter just to satisfy their useNavigate() call — no route matching or
// store data involved. Their actual behavior is covered by Vitest+RTL tests colocated with
// each container, and end to end by app/acceptance-tests/{photos,recuerdos}.spec.ts. This
// story now only exercises what PhotosView still owns directly: the photo grid and header.
const meta = {
  title: 'Screens/Chapter/ChapterDetail',
  component: PhotosView,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [withRouter],
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

const sharedDefaults = {
  chapter,
  photos,
  baulId: 'b1',
  baulName: 'Familia García',
  chapterId: 'c1',
  recuerdosCount: 1,
  onBack: () => alert('onBack clicked'),
  onSelectPhoto: (photo: Photo) => alert(`onSelectPhoto: ${photo.id}`),
  onUploadPhotos: () => alert('onUploadPhotos clicked'),
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
    chapterId: null,
    recuerdosCount: 0,
  },
};
