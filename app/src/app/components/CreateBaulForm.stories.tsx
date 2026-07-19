import type { Meta, StoryObj } from '@storybook/react-vite';
import { CreateBaulForm } from './CreateBaulForm';

const meta = {
  title: 'Components/CreateBaulForm',
  component: CreateBaulForm,
  tags: ['autodocs'],
} satisfies Meta<typeof CreateBaulForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onBack: () => {},
    onSubmit: () => {},
  },
};

export const Onboarding: Story = {
  args: {
    onBack: () => {},
    onSubmit: () => {},
    isOnboarding: true,
  },
};

export const Submitting: Story = {
  args: {
    onBack: () => {},
    onSubmit: () => {},
    isSubmitting: true,
  },
};
