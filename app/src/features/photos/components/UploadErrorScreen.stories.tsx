import type { Meta, StoryObj } from '@storybook/react-vite';
import { UploadErrorScreen } from '@/features/photos/components/UploadErrorScreen';
import { SelectedPhoto } from '@/features/photos/components/UploadConfirmationScreen';

const meta = {
  title: 'Screens/Upload/Error',
  component: UploadErrorScreen,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof UploadErrorScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

const failedPhotos: SelectedPhoto[] = [
  { id: '1', file: new File([], 'photo1.jpg'), preview: 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=300' },
  { id: '2', file: new File([], 'photo2.jpg'), preview: 'https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?w=300' },
];

export const Default: Story = {
  args: {
    failedPhotos,
    succeededCount: 8,
    onRetry: () => alert('onRetry clicked'),
    onBack: () => alert('onBack clicked'),
  },
};
