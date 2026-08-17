import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { UploadingScreen } from '@/features/photos/components/UploadingScreen';
import { UploadItemResult } from '@/features/photos/uploadFlow';
import { storybookPhotos } from '@/storybook/fixtures';

const meta = {
  title: 'Screens/Upload/Uploading',
  component: UploadingScreen,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof UploadingScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

const photos = [
  { id: '1', file: new File([], 'photo1.jpg'), preview: storybookPhotos.beach },
  { id: '2', file: new File([], 'photo2.jpg'), preview: storybookPhotos.album },
  { id: '3', file: new File([], 'photo3.jpg'), preview: storybookPhotos.sunset },
];

// Keep the story pinned in the uploading state so snapshots do not depend on capture timing.
const keepUploading = () => new Promise<UploadItemResult[]>(() => {});

export const Default: Story = {
  args: {
    photos,
    onUpload: keepUploading,
    onSettled: fn(),
  },
};

// Regression coverage for issue #37: with many photos the header (icon, title, progress)
// must stay visible and only the photo grid should scroll.
const manyPhotos = Array.from({ length: 30 }, (_, i) => ({
  id: `${i + 1}`,
  file: new File([], `photo${i + 1}.jpg`),
  preview: storybookPhotos.beach,
}));

export const ManyPhotos: Story = {
  args: {
    photos: manyPhotos,
    onUpload: keepUploading,
    onSettled: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('heading', { name: 'Guardando tus recuerdos…' })).toBeInTheDocument();
    await expect(canvas.getByText('0 de 30 fotos subidas')).toBeInTheDocument();
    await expect(canvas.getAllByAltText('Preview')).toHaveLength(30);
  },
};

export const DeterministicSettled: Story = {
  args: {
    photos,
    onUpload: fn(async (_photos, onItemSettled) => {
      const results: UploadItemResult[] = [
        { clientUploadId: '1' },
        { clientUploadId: '2' },
        { clientUploadId: '3', error: 'No se pudo procesar la foto' },
      ];
      results.forEach(onItemSettled);
      return results;
    }),
    onSettled: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('heading', { name: 'Guardando tus recuerdos…' })).toBeInTheDocument();
    await expect(args.onUpload).toHaveBeenCalled();

    await waitFor(() => expect(canvas.getByText('2 de 3 fotos subidas')).toBeInTheDocument());
    await expect(args.onSettled).toHaveBeenCalledWith([
      { clientUploadId: '1' },
      { clientUploadId: '2' },
      { clientUploadId: '3', error: 'No se pudo procesar la foto' },
    ]);
  },
};
