import type { Meta, StoryObj } from '@storybook/react-vite';
import { UploadingScreen } from '@/features/photos/components/UploadingScreen';
import { UploadItemResult } from '@/store/useBaulesStore';
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
    onSettled: (results) => alert(`onSettled: ${results.length} resultados`),
  },
};
