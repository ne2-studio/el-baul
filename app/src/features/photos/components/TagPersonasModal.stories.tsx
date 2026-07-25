import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { TagPersonasModal } from '@/features/photos/components/TagPersonasModal';
import { Persona } from '@/types';

const meta = {
  title: 'Features/Photos/TagPersonasModal',
  component: TagPersonasModal,
  tags: ['autodocs'],
} satisfies Meta<typeof TagPersonasModal>;

export default meta;
type Story = StoryObj<typeof meta>;

const personas: Persona[] = [
  { id: '1', nickname: 'Abuela Rosa', avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100' } as Persona,
  { id: '2', nickname: 'Papá' } as Persona,
  { id: '3', nickname: 'Marta' } as Persona,
];

export const Default: Story = {
  args: {
    personas,
    selectedIds: ['1'],
    onToggle: (id) => alert(`onToggle: ${id}`),
    onCancel: () => alert('onCancel clicked'),
    onConfirm: () => alert('onConfirm clicked'),
  },
};

export const Interactive: Story = {
  args: {
    ...Default.args,
  },
  render: (args) => {
    function InteractiveTagPersonasModal() {
      const [selectedIds, setSelectedIds] = useState<string[]>(args.selectedIds);
      return (
        <TagPersonasModal
          {...args}
          selectedIds={selectedIds}
          onToggle={(id) =>
            setSelectedIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))
          }
        />
      );
    }
    return <InteractiveTagPersonasModal />;
  },
};
