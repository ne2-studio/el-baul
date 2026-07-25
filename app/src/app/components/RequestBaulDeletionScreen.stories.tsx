import type { Meta, StoryObj } from '@storybook/react-vite';
import { RequestBaulDeletionScreen } from './RequestBaulDeletionScreen';

const meta = {
  title: 'Screens/Baules/RequestDeletion',
  component: RequestBaulDeletionScreen,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof RequestBaulDeletionScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    baulName: 'Familia García',
    onBack: () => alert('onBack clicked'),
    onSubmit: (reason) => alert(`onSubmit: ${reason}`),
  },
};

export const Submitting: Story = {
  args: {
    ...Default.args,
    isSubmitting: true,
  },
};
