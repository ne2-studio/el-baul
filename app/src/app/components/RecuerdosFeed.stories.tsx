import type { Meta, StoryObj } from '@storybook/react-vite';
import { RecuerdosFeed } from './RecuerdosFeed';
import { Photo, Recuerdo } from './PhotosView';

const meta = {
  title: 'Components/RecuerdosFeed',
  component: RecuerdosFeed,
  tags: ['autodocs'],
  decorators: [(Story) => <div className="max-w-2xl mx-auto px-6 py-6 bg-background min-h-screen"><Story /></div>],
} satisfies Meta<typeof RecuerdosFeed>;

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

const recuerdos: Recuerdo[] = [
  {
    id: 'r1',
    text: '¡Qué día tan bonito! Recuerdo que hacía muchísimo calor y acabamos todos bañándonos en el río.',
    personaId: 'user-1',
    userName: 'Ana García',
    createdAt: '2024-07-15T10:00:00Z',
    photoId: 'p1',
    photoThumbnailUrl: photos[0].thumbnailUrl,
  },
  {
    id: 'r2',
    text: 'Yo estuve ahí, fue un día increíble.',
    userName: 'Yo',
    isOwn: true,
    createdAt: '2024-07-17T10:00:00Z',
  },
  {
    id: 'r3',
    text: 'No me acordaba de esta foto, gracias por compartirla.',
    personaId: 'user-3',
    userName: 'Carlos Ruiz',
    createdAt: '2024-07-16T10:00:00Z',
  },
];

export const Default: Story = {
  args: {
    active: true,
    photos,
    recuerdos,
    selectionMode: false,
    onSelectPhoto: () => alert('onSelectPhoto clicked'),
    onAddRecuerdo: (text) => alert(`onAddRecuerdo: ${text}`),
    onUserClick: (personaId) => alert(`onUserClick: ${personaId}`),
  },
};

export const Empty: Story = {
  args: {
    ...Default.args,
    recuerdos: [],
  },
};

// FAB is hidden while the photo grid's multi-select mode is active (feed content still shows).
export const SelectionModeActive: Story = {
  args: {
    ...Default.args,
    selectionMode: true,
  },
};

export const WithoutUserClick: Story = {
  args: {
    ...Default.args,
    onUserClick: undefined,
  },
};
