import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MoveModal } from './MoveModal';
import { Album } from './AlbumsView';

const meta = {
  title: 'Components/MoveModal',
  component: MoveModal,
  tags: ['autodocs'],
} satisfies Meta<typeof MoveModal>;

export default meta;
type Story = StoryObj<typeof meta>;

const albums: Album[] = [
  { id: '1', name: 'Verano 2023', photoCount: 42 },
  { id: '2', name: 'Cumpleaños de la abuela', photoCount: 18 },
  { id: '3', name: 'Navidad', photoCount: 30 },
];

export const Default: Story = {
  args: {
    title: 'Mover a otro capítulo',
    albums,
    selectedId: '',
    onSelect: () => {},
    onCancel: () => {},
    onConfirm: () => {},
  },
};

export const Submitting: Story = {
  args: {
    ...Default.args,
    selectedId: '2',
    isSubmitting: true,
  },
};

export const Interactive: Story = {
  args: Default.args,
  render: function Render() {
    const [selectedId, setSelectedId] = useState('');
    return (
      <MoveModal
        title="Mover a otro capítulo"
        albums={albums}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onCancel={() => {}}
        onConfirm={() => {}}
      />
    );
  },
};
