import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { UploadConfirmationScreen } from '@/features/photos/components/UploadConfirmationScreen';
import { Chapter } from '@/types';
import { storybookPhotos } from '@/storybook/fixtures';

const meta = {
  title: 'Screens/Upload/Confirmation',
  component: UploadConfirmationScreen,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof UploadConfirmationScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

const currentChapter: Chapter = { id: 'c1', name: 'Verano 2024', photoCount: 12, lastUpdated: 'hace 1 día', recuerdoCount: 0, undatedPhotoCount: 0 };

const selectedPhotos = [
  { id: '1', file: new File([], 'photo1.jpg'), preview: storybookPhotos.beach },
  { id: '2', file: new File([], 'photo2.jpg'), preview: storybookPhotos.album },
  { id: '3', file: new File([], 'photo3.jpg'), preview: storybookPhotos.sunset },
];

export const Empty: Story = {
  args: {
    currentChapter,
    selectedPhotos: [],
    onBack: fn(),
    onUpload: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Sube tus fotos')).toBeInTheDocument();
    await expect(canvas.queryByRole('button', { name: 'Subir fotos' })).not.toBeInTheDocument();
  },
};

export const WithSelectedPhotos: Story = {
  args: {
    currentChapter,
    selectedPhotos,
    onBack: fn(),
    onUpload: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('3 fotos seleccionadas')).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Subir fotos' })).toBeEnabled();

    await userEvent.hover(canvas.getAllByAltText('Preview')[0]);
    await userEvent.click(canvas.getAllByRole('button', { name: 'Quitar foto' })[0]);
    await expect(canvas.getByText('2 fotos seleccionadas')).toBeInTheDocument();

    await userEvent.click(canvas.getByRole('button', { name: 'Subir fotos' }));
    await expect(args.onUpload).toHaveBeenCalledWith([selectedPhotos[1], selectedPhotos[2]]);
  },
};

// Regression coverage for issue #37: at the 30-photo cap the grid should still render
// cleanly, with the "Añadir más fotos" tile letting the user try to add more (which then
// gets trimmed with a toast, exercised at the integration level in the test suite).
const maxPhotos = Array.from({ length: 30 }, (_, i) => ({
  id: `${i + 1}`,
  file: new File([], `photo${i + 1}.jpg`),
  preview: storybookPhotos.beach,
}));

export const AtMaxPhotos: Story = {
  args: {
    currentChapter,
    selectedPhotos: maxPhotos,
    onBack: fn(),
    onUpload: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('30 fotos seleccionadas')).toBeInTheDocument();
    await expect(canvas.getAllByAltText('Preview')).toHaveLength(30);
    await expect(canvas.getByRole('button', { name: 'Añadir más fotos' })).toBeInTheDocument();
  },
};

export const RemovingAllPhotosReturnsToEmptyState: Story = {
  args: {
    currentChapter,
    selectedPhotos: [selectedPhotos[0]],
    onBack: fn(),
    onUpload: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.hover(canvas.getAllByAltText('Preview')[0]);
    await userEvent.click(canvas.getByRole('button', { name: 'Quitar foto' }));

    await expect(canvas.getByText('Sube tus fotos')).toBeInTheDocument();
  },
};
