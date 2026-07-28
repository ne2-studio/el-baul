import type { Meta, StoryObj } from '@storybook/react-vite';
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
    onBack: () => alert('onBack clicked'),
    onUpload: (photos, chapter) => alert(`onUpload: ${photos.length} fotos, capítulo ${JSON.stringify(chapter)}`),
  },
};

export const ChoosingChapter: Story = {
  args: {
    ...IntoOpenChapter.args,
    currentChapterId: undefined,
  },
};
