import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from './Input';

const meta = {
  title: 'Components/Input',
  component: Input,
  tags: ['autodocs'],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Nombre del baúl',
    placeholder: 'Ej. Vacaciones en familia',
    value: '',
    onChange: () => {},
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'Nombre del baúl',
    placeholder: 'Ej. Vacaciones en familia',
    value: '',
    helperText: 'Podés cambiarlo más adelante.',
    onChange: () => {},
  },
};

export const Multiline: Story = {
  args: {
    label: 'Descripción',
    placeholder: 'Contanos un poco sobre este baúl...',
    value: '',
    multiline: true,
    rows: 4,
    onChange: () => {},
  },
};

export const Interactive: Story = {
  args: {
    label: 'Nombre del baúl',
    value: '',
    onChange: () => {},
  },
  render: function Render() {
    const [value, setValue] = useState('');
    return <Input label="Nombre del baúl" placeholder="Ej. Vacaciones en familia" value={value} onChange={setValue} />;
  },
};
