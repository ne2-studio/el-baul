import type { Meta, StoryObj } from '@storybook/react-vite';
import { ImageIcon, MessageCircle } from 'lucide-react';
import { ContentCard } from '@/design-system/components/data-display/ContentCard';
import { storybookPhotos } from '@/storybook/fixtures';

const meta = {
  title: 'DesignSystem/DataDisplay/ContentCard',
  component: ContentCard,
  tags: ['autodocs'],
} satisfies Meta<typeof ContentCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Verano 2024',
    coverImageUrl: storybookPhotos.beach,
    subtitle: '1 jul – 15 ago 2024',
    counters: [
      { icon: <ImageIcon />, label: '24 fotos' },
      { icon: <MessageCircle />, label: '3 recuerdos' },
    ],
    onClick: () => alert('onClick'),
  },
};

export const WithoutCoverImage: Story = {
  args: {
    ...Default.args,
    coverImageUrl: undefined,
  },
};

export const WithoutSubtitleOrCounters: Story = {
  args: {
    title: 'Cámara',
    onClick: () => alert('onClick'),
  },
};
