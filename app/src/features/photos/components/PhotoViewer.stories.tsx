import type { Meta, StoryObj } from '@storybook/react-vite';
import { PhotoViewer } from '@/features/photos/components/PhotoViewer';
import { Chapter, Photo, Recuerdo } from '@/types';
import { storybookPhotos } from '@/storybook/fixtures';
import { viewportGlobals } from '@/storybook/viewports';

const meta = {
  title: 'Features/Photos/PhotoViewer',
  component: PhotoViewer,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof PhotoViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

const photos: Photo[] = [
  { id: '1', thumbnailUrl: storybookPhotos.beach, fullUrl: storybookPhotos.beach, recuerdoCount: 0 },
  { id: '2', thumbnailUrl: storybookPhotos.album, fullUrl: storybookPhotos.album, date: { year: 2024, month: 7, day: 15 }, recuerdoCount: 2 },
  { id: '3', thumbnailUrl: storybookPhotos.sunset, fullUrl: storybookPhotos.sunset, recuerdoCount: 0 },
];

const chapters: Chapter[] = [
  { id: 'a1', name: 'Verano 2024', photoCount: 3, lastUpdated: 'hace 1 día', recuerdoCount: 2, undatedPhotoCount: 0 },
  { id: 'a2', name: 'Navidad', photoCount: 12, lastUpdated: 'hace 2 días', recuerdoCount: 0, undatedPhotoCount: 0 },
];

const recuerdos: Recuerdo[] = [
  { id: '1', text: '¡Qué día tan bonito! No me acordaba de que hacía tanto calor.', userName: 'Ana García', createdAt: '2024-07-15T10:00:00Z' },
  { id: '2', text: 'Yo estuve ahí, fue un día increíble.', userName: 'Yo', isOwn: true, createdAt: '2024-07-16T10:00:00Z' },
];

const sharedDefaults = {
  onClose: () => alert('onClose clicked'),
  onPhotoChange: () => alert('onPhotoChange clicked'),
  onRequestRemoval: async () => true,
  onSetBaulCover: () => alert('onSetBaulCover clicked'),
  onSetChapterCover: () => alert('onSetChapterCover clicked'),
  onMovePhoto: async () => true,
  onChangeDate: async () => true,
  onDeletePhoto: async () => true,
  onAddRecuerdo: () => alert('onAddRecuerdo clicked'),
  onUserClick: () => alert('onUserClick clicked'),
  onDownloadPhoto: () => alert('onDownloadPhoto clicked'),
};

export const Default: Story = {
  args: {
    ...sharedDefaults,
    photo: photos[1],
    photos,
    isAdmin: true,
    allChapters: chapters,
    currentChapter: chapters[0],
    recuerdos,
  },
};

export const FirstPhoto: Story = {
  args: {
    ...Default.args,
    photo: photos[0],
  },
};

export const LastPhoto: Story = {
  args: {
    ...Default.args,
    photo: photos[2],
  },
};

export const WithoutRecuerdos: Story = {
  args: {
    ...Default.args,
    recuerdos: [],
  },
};

export const ReadOnlyCollaborator: Story = {
  args: {
    ...sharedDefaults,
    photo: photos[1],
    photos,
    isAdmin: false,
    onSetBaulCover: undefined,
    onSetChapterCover: undefined,
    onMovePhoto: undefined,
    onChangeDate: undefined,
    onDeletePhoto: undefined,
    onRequestRemoval: undefined,
    allChapters: chapters,
    currentChapter: chapters[0],
    recuerdos,
  },
};

export const PhotoViewerMobileStack: Story = {
  args: {
    ...Default.args,
  },
  globals: viewportGlobals.mobile,
};

export const PhotoViewerDesktopSideNavigation: Story = {
  args: {
    ...Default.args,
  },
  globals: viewportGlobals.desktop,
};
