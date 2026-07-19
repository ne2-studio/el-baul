import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { PartialDatePicker } from './PartialDatePicker';
import { PhotoDate } from '@/types';

const meta = {
  title: 'Components/PartialDatePicker',
  component: PartialDatePicker,
  tags: ['autodocs'],
} satisfies Meta<typeof PartialDatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onChange: () => {},
  },
};

export const WithUnknownToggle: Story = {
  args: {
    allowUnknown: true,
    onChange: () => {},
  },
};

export const Prefilled: Story = {
  args: {
    initialValue: { year: 2021, month: 8, day: 3 },
    onChange: () => {},
  },
};

export const Interactive: Story = {
  args: {
    onChange: () => {},
  },
  render: function Render() {
    const [value, setValue] = useState<PhotoDate | null>(null);
    const [unknown, setUnknown] = useState(false);
    return (
      <div className="space-y-3">
        <PartialDatePicker
          allowUnknown
          onChange={(v, u) => { setValue(v); setUnknown(u); }}
        />
        <p className="text-xs text-muted-foreground">
          {unknown ? 'Sin fecha (no me acuerdo)' : value ? JSON.stringify(value) : 'Sin valor'}
        </p>
      </div>
    );
  },
};
