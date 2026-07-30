import type { Meta, StoryObj } from '@storybook/react-vite';
import { CreateBaulModal } from '@/features/baules/components/CreateBaulModal';

const meta = {
  title: 'Features/Baules/CreateBaulModal',
  component: CreateBaulModal,
  tags: ['autodocs'],
} satisfies Meta<typeof CreateBaulModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onCancel: () => alert('onCancel clicked'),
    onSave: () => alert('onSave clicked'),
  },
};

export const Onboarding: Story = {
  args: {
    onCancel: () => alert('onCancel clicked'),
    onSave: () => alert('onSave clicked'),
    isOnboarding: true,
  },
};

export const Submitting: Story = {
  args: {
    onCancel: () => alert('onCancel clicked'),
    onSave: () => alert('onSave clicked'),
    isSubmitting: true,
  },
};
