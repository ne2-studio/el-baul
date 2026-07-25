import type { Meta, StoryObj } from '@storybook/react-vite';
import { NuevoRecuerdoModal } from './NuevoRecuerdoModal';

const meta = {
  title: 'Features/Memories/NuevoRecuerdoModal',
  component: NuevoRecuerdoModal,
  tags: ['autodocs'],
} satisfies Meta<typeof NuevoRecuerdoModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onCancel: () => alert('onCancel clicked'),
    onSave: (text) => alert(`onSave: ${text}`),
  },
};

export const Submitting: Story = {
  args: {
    ...Default.args,
    isSubmitting: true,
  },
};
