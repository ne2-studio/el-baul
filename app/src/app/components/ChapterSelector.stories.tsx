import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChapterSelector, ChapterSelection } from './ChapterSelector';
import { Chapter } from './ChaptersView';

const meta = {
  title: 'Components/ChapterSelector',
  component: ChapterSelector,
  tags: ['autodocs'],
} satisfies Meta<typeof ChapterSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

const chapters: Chapter[] = [
  { id: '1', name: 'Verano 2023', photoCount: 42 },
  { id: '2', name: 'Cumpleaños de la abuela', photoCount: 18 },
  { id: '3', name: 'Navidad', photoCount: 30 },
];

export const Default: Story = {
  args: {
    chapters,
    value: null,
    onChange: () => alert('onChange clicked'),
  },
};

export const WithCurrentChapter: Story = {
  args: {
    chapters,
    currentChapterId: '2',
    value: { type: 'existing', chapterId: '2' },
    onChange: () => alert('onChange clicked'),
  },
};

export const CreatingNew: Story = {
  args: {
    chapters,
    value: { type: 'new', name: 'Viaje a la playa' },
    onChange: () => alert('onChange clicked'),
  },
};

export const Interactive: Story = {
  args: {
    chapters,
    value: null,
    onChange: () => alert('onChange clicked'),
  },
  render: function Render() {
    const [value, setValue] = useState<ChapterSelection | null>(null);
    return <ChapterSelector chapters={chapters} value={value} onChange={setValue} />;
  },
};
