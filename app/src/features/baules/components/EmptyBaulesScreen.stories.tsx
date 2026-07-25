import type { Meta, StoryObj } from '@storybook/react-vite';
import { EmptyBaulesScreen } from '@/features/baules/components/EmptyBaulesScreen';

const meta = {
  title: 'Screens/Baules/Empty',
  component: EmptyBaulesScreen,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof EmptyBaulesScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onCreateFirstBaul: () => alert('onCreateFirstBaul clicked'),
  },
};
