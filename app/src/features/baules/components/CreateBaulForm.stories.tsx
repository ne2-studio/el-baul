import type { Meta, StoryObj } from '@storybook/react-vite';
import { CreateBaulForm } from '@/features/baules/components/CreateBaulForm';

const meta = {
  title: 'Features/Baules/CreateBaulForm',
  component: CreateBaulForm,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof CreateBaulForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onBack: () => alert('onBack clicked'),
    onSubmit: () => alert('onSubmit clicked'),
    initialName: 'Familia Jimena',
  },
};

export const Submitting: Story = {
  args: {
    onBack: () => alert('onBack clicked'),
    onSubmit: () => alert('onSubmit clicked'),
    initialName: 'Familia Jimena',
    isSubmitting: true,
  },
};
