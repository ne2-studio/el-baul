import type { Meta, StoryObj } from '@storybook/react-vite';
import { Plus, Upload, Sparkles } from 'lucide-react';
import { SimpleFAB, ExpandableFAB } from './FAB';

const meta = {
  title: 'Components/Actions/FAB',
  component: SimpleFAB,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof SimpleFAB>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Simple: Story = {
  args: {
    label: 'Nuevo baúl',
    onClick: () => alert('onClick'),
  },
};

export const Expandable: Story = {
  args: {
    label: 'unused',
    onClick: () => {},
  },
  render: () => (
    <ExpandableFAB
      actions={[
        { label: 'Nuevo capítulo', icon: <Plus className="w-4 h-4" />, onClick: () => alert('Nuevo capítulo') },
        { label: 'Subir fotos', icon: <Upload className="w-4 h-4" />, onClick: () => alert('Subir fotos') },
        { label: 'Ayúdame a recordar', icon: <Sparkles className="w-4 h-4" />, onClick: () => alert('Ayúdame a recordar') },
      ]}
    />
  ),
};
