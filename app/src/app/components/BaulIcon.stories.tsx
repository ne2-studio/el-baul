import type { Meta, StoryObj } from '@storybook/react-vite';
import { BaulIcon } from './BaulIcon';

const meta = {
  title: 'Components/BaulIcon',
  component: BaulIcon,
  tags: ['autodocs'],
} satisfies Meta<typeof BaulIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    className: 'w-16 h-16 text-primary',
  },
};

export const Small: Story = {
  args: {
    className: 'w-6 h-6 text-primary',
  },
};
