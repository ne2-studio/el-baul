import type { Meta, StoryObj } from '@storybook/react-vite';
import { CreateChapterModal } from '@/features/chapters/components/CreateChapterModal';

const meta = {
  title: 'Features/Chapters/CreateChapterModal',
  component: CreateChapterModal,
  tags: ['autodocs'],
} satisfies Meta<typeof CreateChapterModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onCancel: () => alert('onCancel clicked'),
    onSave: () => alert('onSave clicked'),
  },
};

export const Submitting: Story = {
  args: {
    onCancel: () => alert('onCancel clicked'),
    onSave: () => alert('onSave clicked'),
    isSubmitting: true,
  },
};
