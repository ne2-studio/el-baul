import type { Meta, StoryObj } from '@storybook/react-vite';
import { BaulesLoadingScreen } from './BaulesLoadingScreen';

const meta = {
  title: 'Screens/Baules/Loading',
  component: BaulesLoadingScreen,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof BaulesLoadingScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
