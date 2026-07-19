import type { Meta, StoryObj } from '@storybook/react-vite';
import { CreateAlbumForm } from './CreateAlbumForm';

const meta = {
  title: 'Components/CreateAlbumForm',
  component: CreateAlbumForm,
  tags: ['autodocs'],
} satisfies Meta<typeof CreateAlbumForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onBack: () => {},
    onSubmit: () => {},
  },
};

export const Submitting: Story = {
  args: {
    onBack: () => {},
    onSubmit: () => {},
    isSubmitting: true,
  },
};
