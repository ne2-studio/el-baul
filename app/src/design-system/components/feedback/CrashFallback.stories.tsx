import type { Meta, StoryObj } from '@storybook/react-vite';
import { CrashFallback } from '@/design-system/components/feedback/CrashFallback';

const meta = {
  title: 'Components/Feedback/CrashFallback',
  component: CrashFallback,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof CrashFallback>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
