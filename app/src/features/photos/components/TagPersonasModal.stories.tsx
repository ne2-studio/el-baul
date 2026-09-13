import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import { TagPersonasModal } from '@/features/photos/components/TagPersonasModal';
import { Persona } from '@/types';
import { storybookAvatars } from '@/storybook/fixtures';

const meta = {
  title: 'Features/Photos/TagPersonasModal',
  component: TagPersonasModal,
  tags: ['autodocs'],
} satisfies Meta<typeof TagPersonasModal>;

export default meta;
type Story = StoryObj<typeof meta>;

const personas: Persona[] = [
  { id: '1', nickname: 'Abuela Rosa', avatarUrl: storybookAvatars.abuela } as Persona,
  { id: '2', nickname: 'Papá' } as Persona,
  { id: '3', nickname: 'Marta' } as Persona,
];

export const Default: Story = {
  args: {
    personas,
    selectedIds: ['1'],
    onToggle: fn(),
    onCreatePersona: fn(),
    onCancel: fn(),
    onConfirm: fn(),
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
          onToggle={(id) => {
            args.onToggle(id);
            setSelectedIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
          }}
        />
      );
    }
    return <InteractiveTagPersonasModal />;
  },
  play: async ({ args }) => {
    // TagPersonasModal renders BottomSheetModal, which portals to document.body (see its
    // comment) instead of rendering inside canvasElement.
    const body = within(document.body);

    // Marcar a "Papá" lo saca de la lista y lo convierte en chip arriba (alternativa 1d) —
    // nunca se ve dos veces.
    const papaButton = body.getByRole('button', { name: /Papá/ });
    await userEvent.click(papaButton);
    await expect(args.onToggle).toHaveBeenCalledWith('2');
    await expect(body.queryByRole('button', { name: /^Papá$/ })).not.toBeInTheDocument();
    await expect(body.getByRole('button', { name: 'Quitar a Papá' })).toBeInTheDocument();

    const martaButton = body.getByRole('button', { name: /Marta/ });
    martaButton.focus();
    await expect(martaButton).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onToggle).toHaveBeenCalledWith('3');

    await userEvent.click(body.getByRole('button', { name: 'Guardar' }));
    await expect(args.onConfirm).toHaveBeenCalled();
  },
};
