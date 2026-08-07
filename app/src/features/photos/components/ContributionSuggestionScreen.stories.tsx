import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ContributionSuggestionScreen } from '@/features/photos/components/ContributionSuggestionScreen';
import { Persona, Photo } from '@/types';
import { storybookAvatars, storybookPhotos } from '@/storybook/fixtures';

const meta = {
  title: 'Features/Photos/ContributionSuggestionScreen',
  component: ContributionSuggestionScreen,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof ContributionSuggestionScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

const photo: Photo = { id: '1', thumbnailUrl: storybookPhotos.beach, fullUrl: storybookPhotos.beach, recuerdoCount: 0 };

const personas: Persona[] = [
  { id: '1', nickname: 'Abuela Rosa', avatarUrl: storybookAvatars.abuela } as Persona,
  { id: '2', nickname: 'Papá' } as Persona,
  { id: '3', nickname: 'Marta' } as Persona,
];

export const Default: Story = {
  args: {
    photo,
    personas,
    selectedIds: [],
    onToggle: fn(),
    onSkip: fn(),
    onSave: fn(),
  },
};

export const WithSelection: Story = {
  args: {
    ...Default.args,
    selectedIds: ['1'],
  },
};

export const Interactive: Story = {
  args: {
    ...Default.args,
  },
  render: (args) => {
    function InteractiveScreen() {
      const [selectedIds, setSelectedIds] = useState<string[]>(args.selectedIds);
      return (
        <ContributionSuggestionScreen
          {...args}
          selectedIds={selectedIds}
          onToggle={(id) => {
            args.onToggle(id);
            setSelectedIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
          }}
        />
      );
    }
    return <InteractiveScreen />;
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // Nada seleccionado: Guardar empieza deshabilitado.
    expect(canvas.getByRole('button', { name: 'Guardar' })).toBeDisabled();

    await userEvent.click(canvas.getByText('Papá'));
    await expect(args.onToggle).toHaveBeenCalledWith('2');
    await expect(canvas.getByRole('button', { name: 'Guardar' })).toBeEnabled();

    await userEvent.click(canvas.getByRole('button', { name: 'Guardar' }));
    await expect(args.onSave).toHaveBeenCalled();

    await userEvent.click(canvas.getByText('Ahora no →'));
    await expect(args.onSkip).toHaveBeenCalled();
  },
};
