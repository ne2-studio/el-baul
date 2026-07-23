import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { TabButton } from './TabButton';

const meta = {
  title: 'Components/TabButton',
  component: TabButton,
  tags: ['autodocs'],
} satisfies Meta<typeof TabButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Active: Story = {
  args: {
    label: 'Fotos',
    count: 12,
    active: true,
    onClick: () => alert('onClick clicked'),
  },
};

export const Inactive: Story = {
  args: {
    label: 'Recuerdos',
    count: 3,
    active: false,
    onClick: () => alert('onClick clicked'),
  },
};

export const WithoutCount: Story = {
  args: {
    label: 'Personas',
    count: 0,
    active: false,
    onClick: () => alert('onClick clicked'),
  },
};

export const InteractiveGroup: Story = {
  args: {
    label: 'Fotos',
    count: 12,
    active: true,
    onClick: () => alert('onClick clicked'),
  },
  render: function Render() {
    const [active, setActive] = useState<'fotos' | 'recuerdos'>('fotos');
    return (
      <div className="flex">
        <TabButton label="Fotos" count={12} active={active === 'fotos'} onClick={() => setActive('fotos')} />
        <TabButton label="Recuerdos" count={3} active={active === 'recuerdos'} onClick={() => setActive('recuerdos')} />
      </div>
    );
  },
};
