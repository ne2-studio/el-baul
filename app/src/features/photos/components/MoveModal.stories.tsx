import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MoveModal } from '@/features/photos/components/MoveModal';
import { Chapter } from '@/types';

const meta = {
  title: 'Features/Photos/MoveModal',
  component: MoveModal,
  tags: ['autodocs'],
} satisfies Meta<typeof MoveModal>;

export default meta;
type Story = StoryObj<typeof meta>;

const chapters: Chapter[] = [
  { id: '1', name: 'Verano 2023', photoCount: 42, lastUpdated: 'hace 1 día', recuerdoCount: 0, undatedPhotoCount: 0 },
  { id: '2', name: 'Cumpleaños de la abuela', photoCount: 18, lastUpdated: 'hace 2 días', recuerdoCount: 0, undatedPhotoCount: 0 },
  { id: '3', name: 'Navidad', photoCount: 30, lastUpdated: 'hace 3 días', recuerdoCount: 0, undatedPhotoCount: 0 },
];

export const Default: Story = {
  args: {
    title: 'Mover a otro capítulo',
    chapters,
    selectedId: '',
    onSelect: () => alert('onSelect clicked'),
    onCancel: () => alert('onCancel clicked'),
    onConfirm: () => alert('onConfirm clicked'),
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
        chapters={chapters}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onCancel={() => alert('onCancel clicked')}
        onConfirm={() => alert('onConfirm clicked')}
      />
    );
  },
};

export const ManyChapters: Story = {
  args: {
    ...Default.args,
    chapters: [
      ...chapters,
      { id: '4', name: 'Boda de Marta y Iván', photoCount: 120, lastUpdated: 'hace 1 semana', recuerdoCount: 0, undatedPhotoCount: 0 },
      { id: '5', name: 'Viaje a Portugal', photoCount: 25, lastUpdated: 'hace 2 semanas', recuerdoCount: 0, undatedPhotoCount: 0 },
      { id: '6', name: 'Navidad en familia', photoCount: 60, lastUpdated: 'hace 1 mes', recuerdoCount: 0, undatedPhotoCount: 0 },
    ],
  },
};
