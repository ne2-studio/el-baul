import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Select } from '@/design-system/components/forms/Select';

const meta = {
  title: 'Components/Forms/Select',
  component: Select,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Purpose
Controlled native select with the product field chrome and correctly aligned dropdown chevron.

### When to use
Use for compact option sets where a native select is enough: month selection, role selection and short modal choices.

### When NOT to use
Do not use for command menus, multi-select lists or rich searchable pickers. Those need a dropdown menu or a dedicated selector.

### Typical examples
Choosing the month in a partial date, choosing a person's access role, or selecting a small fixed option set.

### Common mistakes
Hand-placing a chevron per screen, mixing select padding with arbitrary icon positioning, or using placeholder-only labels.
`,
      },
    },
  },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

const options = [
  { value: '', label: 'Selecciona una opción' },
  { value: 'colaborador', label: 'Colaborador' },
  { value: 'administrador', label: 'Administrador' },
];

export const Default: Story = {
  args: {
    label: 'Rol',
    value: 'colaborador',
    options,
    onChange: () => alert('onChange clicked'),
  },
};

export const WithHelperText: Story = {
  args: {
    ...Default.args,
    helperText: 'Solo los administradores pueden gestionar personas y fotos.',
  },
};

export const Interactive: Story = {
  args: {
    ...Default.args,
  },
  render: function Render() {
    const [value, setValue] = useState('colaborador');
    return <Select label="Rol" value={value} options={options} onChange={setValue} />;
  },
};
