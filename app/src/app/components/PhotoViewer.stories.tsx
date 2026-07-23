import type { Meta, StoryObj } from '@storybook/react-vite';
import { PhotoViewer } from './PhotoViewer';
import { Photo } from './PhotosView';
import { Album } from './AlbumsView';
import { Recuerdo } from './RecuerdoCard';

const meta = {
  title: 'Components/PhotoViewer',
  component: PhotoViewer,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof PhotoViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

const photos: Photo[] = [
  { id: '1', thumbnailUrl: 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=300', fullUrl: 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=1600' },
  { id: '2', thumbnailUrl: 'https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?w=300', fullUrl: 'https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?w=1600', date: { year: 2024, month: 7, day: 15 } },
  { id: '3', thumbnailUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300', fullUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1600' },
];

const albums: Album[] = [
  { id: 'a1', name: 'Verano 2024', photoCount: 3 },
  { id: 'a2', name: 'Navidad', photoCount: 12 },
];

const recuerdos: Recuerdo[] = [
  { id: '1', text: '¡Qué día tan bonito! No me acordaba de que hacía tanto calor.', userName: 'Ana García', createdAt: '2024-07-15T10:00:00Z' },
  { id: '2', text: 'Yo estuve ahí, fue un día increíble.', userName: 'Yo', isOwn: true, createdAt: '2024-07-16T10:00:00Z' },
];

const sharedDefaults = {
  onClose: () => {},
  onPhotoChange: () => {},
  onRequestRemoval: async () => true,
  onSetBaulCover: () => {},
  onSetAlbumCover: () => {},
  onMovePhoto: async () => true,
  onChangeDate: async () => true,
  onDeletePhoto: async () => true,
  onAddRecuerdo: () => {},
  onUserClick: () => {},
  onDownloadPhoto: () => {},
};

export const Default: Story = {
  args: {
    ...sharedDefaults,
    photo: photos[1],
    photos,
    isAdmin: true,
    allAlbums: albums,
    currentAlbum: albums[0],
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
    onSetAlbumCover: undefined,
    onMovePhoto: undefined,
    onChangeDate: undefined,
    onDeletePhoto: undefined,
    onRequestRemoval: undefined,
    allAlbums: albums,
    currentAlbum: albums[0],
    recuerdos,
  },
};
