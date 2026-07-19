import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card } from './Card';

const meta = {
  title: 'Components/Card',
  component: Card,
  tags: ['autodocs'],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <div>
        <h3 className="mb-1">Vacaciones 2025</h3>
        <p className="text-muted-foreground text-sm">12 fotos</p>
      </div>
    ),
  },
};

export const Clickable: Story = {
  args: {
    children: (
      <div>
        <h3 className="mb-1">Cumpleaños de Ana</h3>
        <p className="text-muted-foreground text-sm">8 fotos · toca para abrir</p>
      </div>
    ),
    onClick: () => alert('Card clicked'),
  },
};
