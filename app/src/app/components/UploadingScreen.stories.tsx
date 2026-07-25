import type { Meta, StoryObj } from '@storybook/react-vite';
import { UploadingScreen } from './UploadingScreen';
import { UploadItemResult } from '@/store/useBaulesStore';

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
  { id: '1', file: new File([], 'photo1.jpg'), preview: 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=300' },
  { id: '2', file: new File([], 'photo2.jpg'), preview: 'https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?w=300' },
  { id: '3', file: new File([], 'photo3.jpg'), preview: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300' },
];

// Resuelve una foto cada 900ms para que la animación de progreso se vea en Storybook
// en vez de terminar instantáneamente.
async function simulateUpload(
  photosToUpload: typeof photos,
  onItemSettled: (result: UploadItemResult) => void
): Promise<UploadItemResult[]> {
  const results: UploadItemResult[] = [];
  for (const photo of photosToUpload) {
    await new Promise((resolve) => setTimeout(resolve, 900));
    const result: UploadItemResult = { clientUploadId: photo.id };
    onItemSettled(result);
    results.push(result);
  }
  return results;
}

export const Default: Story = {
  args: {
    photos,
    onUpload: simulateUpload,
    onSettled: (results) => alert(`onSettled: ${results.length} resultados`),
  },
};
