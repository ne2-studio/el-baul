import type { Meta, StoryObj } from '@storybook/react-vite';
import { NuevaPersonaModal } from './NuevaPersonaModal';

const meta = {
  title: 'Components/NuevaPersonaModal',
  component: NuevaPersonaModal,
  tags: ['autodocs'],
} satisfies Meta<typeof NuevaPersonaModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onCancel: () => {},
    onSave: () => {},
  },
};

export const Submitting: Story = {
  args: {
    onCancel: () => {},
    onSave: () => {},
    isSubmitting: true,
  },
};
