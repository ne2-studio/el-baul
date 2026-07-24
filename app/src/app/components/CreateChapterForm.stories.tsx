import type { Meta, StoryObj } from '@storybook/react-vite';
import { CreateChapterForm } from './CreateChapterForm';

const meta = {
  title: 'Components/CreateChapterForm',
  component: CreateChapterForm,
  tags: ['autodocs'],
} satisfies Meta<typeof CreateChapterForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onBack: () => alert('onBack clicked'),
    onSubmit: () => alert('onSubmit clicked'),
  },
};

export const Submitting: Story = {
  args: {
    onBack: () => alert('onBack clicked'),
    onSubmit: () => alert('onSubmit clicked'),
    isSubmitting: true,
  },
};
