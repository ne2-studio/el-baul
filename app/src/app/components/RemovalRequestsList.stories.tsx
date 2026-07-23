import type { Meta, StoryObj } from '@storybook/react-vite';
import { RemovalRequestsList, RemovalRequest } from './RemovalRequestsList';

const meta = {
  title: 'Components/RemovalRequestsList',
  component: RemovalRequestsList,
  tags: ['autodocs'],
} satisfies Meta<typeof RemovalRequestsList>;

export default meta;
type Story = StoryObj<typeof meta>;

const requests: RemovalRequest[] = [
  {
    id: '1',
    photoId: 'p1',
    photoUrl: 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=600',
    requesterName: 'Ana García',
    requesterEmail: 'ana@example.com',
    reason: 'No me gusta cómo salgo en esta foto',
    requestDate: 'hace 2 días',
    status: 'pending',
  },
  {
    id: '2',
    photoId: 'p2',
    photoUrl: 'https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?w=600',
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
