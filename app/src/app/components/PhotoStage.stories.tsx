import type { Meta, StoryObj } from '@storybook/react-vite';
import { PhotoStage } from './PhotoStage';

const meta = {
  title: 'Components/PhotoStage',
  component: PhotoStage,
  tags: ['autodocs'],
  decorators: [(Story) => <div className="bg-foreground h-[70vh]"><Story /></div>],
} satisfies Meta<typeof PhotoStage>;

export default meta;
type Story = StoryObj<typeof meta>;

const src = 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=1200';

export const Default: Story = {
  args: {
    src,
    alt: 'Foto de ejemplo',
    hasPrevious: true,
    hasNext: true,
    onPrevious: () => {},
    onNext: () => {},
  },
};

export const FirstPhoto: Story = {
  args: {
    ...Default.args,
    hasPrevious: false,
  },
};

export const LastPhoto: Story = {
  args: {
    ...Default.args,
    hasNext: false,
  },
};

export const SinglePhoto: Story = {
  args: {
    ...Default.args,
    hasPrevious: false,
    hasNext: false,
  },
};
