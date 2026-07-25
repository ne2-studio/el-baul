import type { Meta, StoryObj } from '@storybook/react-vite';
import { DeleteChapterModal } from '@/features/chapters/components/DeleteChapterModal';

const meta = {
  title: 'Features/Chapters/DeleteChapterModal',
  component: DeleteChapterModal,
  tags: ['autodocs'],
} satisfies Meta<typeof DeleteChapterModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    photoCount: 24,
    recuerdoCount: 6,
    onCancel: () => alert('onCancel clicked'),
    onConfirm: () => alert('onConfirm clicked'),
  },
};

export const Submitting: Story = {
  args: {
    ...Default.args,
    isSubmitting: true,
  },
};
