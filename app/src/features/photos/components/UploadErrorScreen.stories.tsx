import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { UploadErrorScreen } from '@/features/photos/components/UploadErrorScreen';
import { SelectedPhoto } from '@/features/photos/uploadFlow';
import { storybookPhotos } from '@/storybook/fixtures';

const meta = {
  title: 'Screens/Upload/UploadError',
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
    onRetry: fn(),
    onBack: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('heading', { name: 'Algo no ha salido bien' })).toBeInTheDocument();
    await expect(canvas.getByText('8 de 10 fotos subidas · 2 con error')).toBeInTheDocument();

    await userEvent.click(canvas.getByRole('button', { name: 'Reintentar' }));
    await expect(args.onRetry).toHaveBeenCalled();

    await userEvent.click(canvas.getByRole('button', { name: 'Volver al capítulo' }));
    await expect(args.onBack).toHaveBeenCalled();
  },
};
