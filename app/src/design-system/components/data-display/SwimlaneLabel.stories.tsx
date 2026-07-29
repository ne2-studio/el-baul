import type { Meta, StoryObj } from '@storybook/react-vite';
import { SwimlaneLabel } from '@/design-system/components/data-display/SwimlaneLabel';

const meta = {
  title: 'Design System/Data Display/SwimlaneLabel',
  component: SwimlaneLabel,
  tags: ['autodocs'],
} satisfies Meta<typeof SwimlaneLabel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Febrero 2023',
  },
};
