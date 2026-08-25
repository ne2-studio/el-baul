import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { FilterPills } from '@/design-system/components/navigation/FilterPills';

const meta = {
  title: 'Components/Navigation/FilterPills',
  component: FilterPills,
  tags: ['autodocs'],
} satisfies Meta<typeof FilterPills>;

export default meta;
type Story = StoryObj<typeof meta>;

const options: { value: 'sin-capitulo' | 'todas'; label: string }[] = [
  { value: 'sin-capitulo', label: 'Sin capítulo' },
  { value: 'todas', label: 'Todas' },
];

export const SinCapituloActive: Story = {
  args: {
    options,
    value: 'sin-capitulo',
    onChange: () => alert('onChange clicked'),
  },
};

export const TodasActive: Story = {
  args: {
    options,
    value: 'todas',
    onChange: () => alert('onChange clicked'),
  },
};

export const Interactive: Story = {
  args: {
    options,
    value: 'sin-capitulo',
    onChange: () => alert('onChange clicked'),
  },
  render: function Render() {
    const [value, setValue] = useState<'sin-capitulo' | 'todas'>('sin-capitulo');
    return <FilterPills options={options} value={value} onChange={setValue} />;
  },
};
