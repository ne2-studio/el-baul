import type { Meta, StoryObj } from '@storybook/react-vite';
import { UploadErrorScreen } from '@/features/photos/components/UploadErrorScreen';
import { SelectedPhoto } from '@/features/photos/uploadFlow';
import { storybookPhotos } from '@/storybook/fixtures';

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
  { id: '1', file: new File([], 'photo1.jpg'), preview: storybookPhotos.beach },
  { id: '2', file: new File([], 'photo2.jpg'), preview: storybookPhotos.album },
];

export const Default: Story = {
  args: {
    failedPhotos,
    succeededCount: 8,
    onRetry: () => alert('onRetry clicked'),
    onBack: () => alert('onBack clicked'),
  },
};
