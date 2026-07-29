import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChapterCard } from '@/features/baules/components/ChapterCard';
import { Chapter } from '@/types';
import { storybookEdgeText, storybookPhotos } from '@/storybook/fixtures';

const meta = {
  title: 'Features/Baules/ChapterCard',
  component: ChapterCard,
  tags: ['autodocs'],
} satisfies Meta<typeof ChapterCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseChapter: Chapter = {
  id: '1',
  name: 'Verano 2024',
  photoCount: 24,
  coverPhotoUrl: storybookPhotos.beach,
  lastUpdated: 'hace 3 días',
  recuerdoCount: 3,
  minDate: { year: 2024, month: 7, day: 1 },
  maxDate: { year: 2024, month: 8, day: 15 },
  undatedPhotoCount: 0,
} as Chapter;

export const Default: Story = {
  args: {
    chapter: baseChapter,
    onClick: () => alert('onClick'),
  },
};

export const WithoutCoverPhoto: Story = {
  args: {
    ...Default.args,
    chapter: {
      ...baseChapter,
      coverPhotoUrl: undefined,
    } as Chapter,
  },
};

export const WithoutDatesOrRecuerdos: Story = {
  args: {
    ...Default.args,
    chapter: {
      ...baseChapter,
      minDate: undefined,
      maxDate: undefined,
      recuerdoCount: 0,
      photoCount: 1,
    } as Chapter,
  },
};

export const LongName: Story = {
  args: {
    ...Default.args,
    chapter: {
      ...baseChapter,
      name: storybookEdgeText.longChapterName,
      coverPhotoUrl: storybookPhotos.landscape,
      photoCount: 0,
    } as Chapter,
  },
};
