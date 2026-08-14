import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { ContributionSuggestionScreen } from '@/features/photos/components/ContributionSuggestionScreen';
import { PHOTO_STAGE_MAX_HEIGHT_DVH, PHOTO_STAGE_MIN_HEIGHT_DVH } from '@/hooks/usePhotoAspectRatio';
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

const photo: Photo = { id: '1', thumbnailUrl: storybookPhotos.beach, fullUrl: storybookPhotos.beach, recuerdoCount: 0, canDelete: false, canRequestRemoval: true };

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
    onConfirmNoPersonas: fn(),
  },
};

export const WithSelection: Story = {
  args: {
    ...Default.args,
    selectedIds: ['1'],
  },
};

// El panel de la foto ya no tiene un alto fijo (issue #7): se calcula a partir del aspect
// ratio real de la foto, para que una landscape no deje franjas negras que le roban altura a
// la lista de personas de debajo. Estas dos stories comparan el mismo componente con una foto
// landscape (fixture 1200×800) y una portrait (fixture 800×1200, más estrecha que ancha) —
// el play() comprueba que el panel efectivamente cambia de alto entre ambas, no solo que "se
// ve bien" a ojo.
// Reproduce photoStageHeight's clamp() en JS para comparar contra el alto real del panel en un
// navegador de verdad — más fiable que asumir un ratio fijo de la ventana, porque el ancho/alto
// del viewport de test-storybook no está garantizado.
function expectedPanelHeightPx(ratio: number) {
  const minPx = (PHOTO_STAGE_MIN_HEIGHT_DVH / 100) * window.innerHeight;
  const maxPx = (PHOTO_STAGE_MAX_HEIGHT_DVH / 100) * window.innerHeight;
  const idealPx = window.innerWidth / ratio;
  return Math.min(Math.max(idealPx, minPx), maxPx);
}

export const LandscapePhoto: Story = {
  args: {
    ...Default.args,
    photo: { ...photo, fullUrl: storybookPhotos.beach },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const panel = await canvas.findByTestId('photo-stage-panel');
    // Fixture 1200×800 → ratio 1.5. Tolerancia de 20px: 100vw en CSS no siempre coincide
    // exactamente con window.innerWidth (p.ej. si hay scrollbar de página).
    await waitFor(() => {
      expect(Math.abs(panel.getBoundingClientRect().height - expectedPanelHeightPx(1200 / 800))).toBeLessThan(20);
    });
  },
};

export const PortraitPhoto: Story = {
  args: {
    ...Default.args,
    photo: { ...photo, fullUrl: storybookPhotos.portrait },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const panel = await canvas.findByTestId('photo-stage-panel');
    // Fixture 800×1200 → ratio 0.67. Este alto debe ser menor que el 50dvh fijo de antes.
    await waitFor(() => {
      const height = panel.getBoundingClientRect().height;
      expect(Math.abs(height - expectedPanelHeightPx(800 / 1200))).toBeLessThan(20);
      expect(height).toBeLessThan(0.5 * window.innerHeight);
    });
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

    await userEvent.click(canvas.getByText('No hay nadie en esta foto'));
    await expect(args.onConfirmNoPersonas).toHaveBeenCalled();
  },
};
