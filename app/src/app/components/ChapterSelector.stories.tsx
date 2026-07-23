import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChapterSelector, ChapterSelection } from './ChapterSelector';
import { Album } from './AlbumsView';

const meta = {
  title: 'Components/ChapterSelector',
  component: ChapterSelector,
  tags: ['autodocs'],
} satisfies Meta<typeof ChapterSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

const albums: Album[] = [
  { id: '1', name: 'Verano 2023', photoCount: 42 },
  { id: '2', name: 'Cumpleaños de la abuela', photoCount: 18 },
  { id: '3', name: 'Navidad', photoCount: 30 },
];

export const Default: Story = {
  args: {
    albums,
    value: null,
    onChange: () => alert('onChange clicked'),
  },
};

export const WithCurrentAlbum: Story = {
  args: {
    albums,
    currentAlbumId: '2',
    value: { type: 'existing', albumId: '2' },
    onChange: () => alert('onChange clicked'),
  },
};

export const CreatingNew: Story = {
  args: {
    albums,
    value: { type: 'new', name: 'Viaje a la playa' },
    onChange: () => alert('onChange clicked'),
  },
};

export const Interactive: Story = {
  args: {
    albums,
    value: null,
    onChange: () => alert('onChange clicked'),
  },
  render: function Render() {
    const [value, setValue] = useState<ChapterSelection | null>(null);
    return <ChapterSelector albums={albums} value={value} onChange={setValue} />;
  },
};
