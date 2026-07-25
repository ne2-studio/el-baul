import type { Meta, StoryObj } from '@storybook/react-vite';
import { BaulIcon } from '@/design-system/foundations/icons/BaulIcon';

const meta = {
  title: 'Foundations/Icons/BaulIcon',
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
