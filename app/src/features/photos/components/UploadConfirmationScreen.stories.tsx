import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { UploadConfirmationScreen } from '@/features/photos/components/UploadConfirmationScreen';
import { Baul, Chapter } from '@/types';
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

const baul: Baul = { id: 'b1', name: 'Familia García', chapterCount: 3, lastUpdated: 'hace 2 días' };
const currentChapter: Chapter = { id: 'c1', name: 'Verano 2024', photoCount: 12, lastUpdated: 'hace 1 día', recuerdoCount: 0, undatedPhotoCount: 0 };
const existingChapters: Chapter[] = [
  currentChapter,
  { id: 'c2', name: 'Navidad', photoCount: 30, lastUpdated: 'hace 2 días', recuerdoCount: 0, undatedPhotoCount: 0 },
];

const selectedPhotos = [
  { id: '1', file: new File([], 'photo1.jpg'), preview: storybookPhotos.beach },
  { id: '2', file: new File([], 'photo2.jpg'), preview: storybookPhotos.album },
  { id: '3', file: new File([], 'photo3.jpg'), preview: storybookPhotos.sunset },
];

export const IntoOpenChapter: Story = {
  args: {
    baul,
    currentChapter,
    existingChapters,
    currentChapterId: currentChapter.id,
    selectedPhotos,
    onBack: fn(),
    onUpload: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('3 fotos seleccionadas')).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Guardar recuerdos' })).toBeEnabled();

    await userEvent.hover(canvas.getAllByAltText('Preview')[0]);
    await userEvent.click(canvas.getAllByRole('button', { name: 'Quitar foto' })[0]);
    await expect(canvas.getByText('2 fotos seleccionadas')).toBeInTheDocument();

    await userEvent.click(canvas.getByRole('button', { name: 'Guardar recuerdos' }));
    await expect(args.onUpload).toHaveBeenCalledWith(
      [selectedPhotos[1], selectedPhotos[2]],
      { type: 'existing', chapterId: currentChapter.id },
      null
    );
  },
};

export const ChoosingChapter: Story = {
  args: {
    ...IntoOpenChapter.args,
    currentChapterId: undefined,
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const saveButton = canvas.getByRole('button', { name: 'Guardar recuerdos' });

    await expect(saveButton).toBeDisabled();
    await userEvent.click(canvas.getByRole('button', { name: 'Crear un capítulo nuevo' }));
    const nameInput = canvas.getByPlaceholderText('Nombre del capítulo');
    await expect(nameInput).toHaveFocus();
    await expect(saveButton).toBeDisabled();

    await userEvent.type(nameInput, 'Cumpleaños de Carmen');
    await expect(saveButton).toBeEnabled();

    await userEvent.click(saveButton);
    await expect(args.onUpload).toHaveBeenCalledWith(
      selectedPhotos,
      { type: 'new', name: 'Cumpleaños de Carmen' },
      null
    );
  },
};
