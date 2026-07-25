import type { Meta, StoryObj } from '@storybook/react-vite';
import { UploadConfirmationScreen } from '@/features/photos/components/UploadConfirmationScreen';
import { Baul } from '@/features/baules/components/BaulesList';
import { Chapter } from '@/features/baules/components/ChaptersView';

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
const currentChapter: Chapter = { id: 'c1', name: 'Verano 2024', photoCount: 12 };
const existingChapters: Chapter[] = [
  currentChapter,
  { id: 'c2', name: 'Navidad', photoCount: 30 },
];

const selectedPhotos = [
  { id: '1', file: new File([], 'photo1.jpg'), preview: 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=300' },
  { id: '2', file: new File([], 'photo2.jpg'), preview: 'https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?w=300' },
  { id: '3', file: new File([], 'photo3.jpg'), preview: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300' },
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
