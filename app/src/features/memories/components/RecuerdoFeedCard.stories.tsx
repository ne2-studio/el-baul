import type { Meta, StoryObj } from '@storybook/react-vite';
import { RecuerdoFeedCard } from '@/features/memories/components/RecuerdoFeedCard';
import { Recuerdo } from '@/types';

const meta = {
  title: 'Features/Memories/RecuerdoFeedCard',
  component: RecuerdoFeedCard,
  tags: ['autodocs'],
} satisfies Meta<typeof RecuerdoFeedCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseRecuerdo: Recuerdo = {
  id: '1',
  text: '¡Qué día tan bonito! No me acordaba de que hacía tanto calor ese verano.',
  userName: 'Ana García',
  personaId: 'p1',
  createdAt: '2024-07-15T10:00:00Z',
} as Recuerdo;

export const Default: Story = {
  args: {
    recuerdo: baseRecuerdo,
    onUserClick: (id) => alert(`onUserClick: ${id}`),
    onPhotoClick: () => alert('onPhotoClick clicked'),
    onChapterClick: (id) => alert(`onChapterClick: ${id}`),
  },
};

export const WithPhoto: Story = {
  args: {
    ...Default.args,
    recuerdo: {
      ...baseRecuerdo,
      photoId: 'photo-1',
      photoThumbnailUrl: 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=300',
    } as Recuerdo,
  },
};

export const WithChapterBadge: Story = {
  args: {
    ...Default.args,
    recuerdo: {
      ...baseRecuerdo,
      chapterId: 'c1',
      chapterName: 'Verano 2024',
    } as Recuerdo,
  },
};

export const Own: Story = {
  args: {
    ...Default.args,
    recuerdo: { ...baseRecuerdo, isOwn: true } as Recuerdo,
  },
};
