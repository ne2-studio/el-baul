import type { Meta, StoryObj } from '@storybook/react-vite';
import { RecuerdoInput } from './RecuerdoInput';

const meta = {
  title: 'Components/RecuerdoInput',
  component: RecuerdoInput,
  tags: ['autodocs'],
  decorators: [(Story) => <div className="bg-foreground p-8"><Story /></div>],
} satisfies Meta<typeof RecuerdoInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    photoId: 'photo-1',
    onSubmit: (text) => alert(`onSubmit clicked: ${text}`),
  },
};
