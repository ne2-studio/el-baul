import type { Meta, StoryObj } from '@storybook/react-vite';
import { SwimlaneLabel } from '@/design-system/components/data-display/SwimlaneLabel';

const meta = {
  title: 'Components/DataDisplay/SwimlaneLabel',
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

export const Interactive: Story = {
  args: {
    children: 'Febrero 2023',
    onClick: () => alert('onClick'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Pasa el ratón por encima: el check vacío se desliza desde la izquierda, como en Google Photos.',
      },
    },
  },
};

export const InteractiveSelected: Story = {
  args: {
    children: 'Febrero 2023',
    onClick: () => alert('onClick'),
    selected: true,
  },
};

export const InteractiveWithSomeSelected: Story = {
  name: 'Interactive, group not fully selected',
  args: {
    children: 'Febrero 2023',
    onClick: () => alert('onClick'),
    selected: false,
  },
};
