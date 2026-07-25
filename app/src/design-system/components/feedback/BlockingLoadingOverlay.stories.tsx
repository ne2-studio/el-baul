import type { Meta, StoryObj } from '@storybook/react-vite';
import { BlockingLoadingOverlay } from '@/design-system/components/feedback/BlockingLoadingOverlay';

const meta = {
  title: 'Components/Feedback/BlockingLoadingOverlay',
  component: BlockingLoadingOverlay,
  tags: ['autodocs'],
} satisfies Meta<typeof BlockingLoadingOverlay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    message: 'Cargando baúl...',
  },
};

export const LongMessage: Story = {
  args: {
    message: 'Actualizando fecha de 12 fotos...',
  },
};
