import type { Meta, StoryObj } from '@storybook/react-vite';
import { RemovalRequestsList, RemovalRequest } from '@/features/photos/components/RemovalRequestsList';
import { storybookPhotos } from '@/storybook/fixtures';

const meta = {
  title: 'Features/Photos/RemovalRequestsList',
  component: RemovalRequestsList,
  tags: ['autodocs'],
} satisfies Meta<typeof RemovalRequestsList>;

export default meta;
type Story = StoryObj<typeof meta>;

const requests: RemovalRequest[] = [
  {
    id: '1',
    photoId: 'p1',
    photoUrl: storybookPhotos.beach,
    requesterName: 'Ana García',
    requesterEmail: 'ana@example.com',
    reason: 'No me gusta cómo salgo en esta foto',
    requestDate: 'hace 2 días',
    status: 'pending',
  },
  {
    id: '2',
    photoId: 'p2',
    photoUrl: storybookPhotos.album,
    requesterName: 'Carlos Ruiz',
    requesterEmail: 'carlos@example.com',
    reason: 'Esta foto es de otra persona que no dio su consentimiento',
    requestDate: 'hace 5 horas',
    status: 'pending',
  },
];

export const Default: Story = {
  args: {
    requests,
    onBack: () => alert('onBack clicked'),
    onRemovePhoto: async () => true,
    onKeepPhoto: async () => true,
  },
};

export const Empty: Story = {
  args: {
    requests: [],
    onBack: () => alert('onBack clicked'),
    onRemovePhoto: async () => true,
    onKeepPhoto: async () => true,
  },
};
