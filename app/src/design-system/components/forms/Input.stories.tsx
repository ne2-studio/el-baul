import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from '@/design-system/components/forms/Input';

const meta = {
  title: 'Components/Forms/Input',
  component: Input,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Purpose
Basic text-entry primitive for named fields, descriptions and short free-text metadata.

### When to use
Use for simple controlled text values with a visible label, placeholder and optional helper text. Use \`multiline\` for descriptions or biography-like content.

### When NOT to use
Do not use for dates, option sets, photos, permissions or domain-specific selectors. Do not hide the label and rely only on placeholder text.

### Typical examples
Baul name, baul description, editable person or profile information, support form text and modal edit fields.

### Common mistakes
Using helper text as an error state, exposing huge free-form objects through controls, or using a one-line input for long descriptive copy.

### Related components
\`PartialDatePicker\` for uncertain dates, \`EditInfoModal\` for modal edit forms, \`Button\` for submit actions.
`,
      },
    },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Nombre del baúl',
    placeholder: 'Ej. Vacaciones en familia',
    value: '',
    onChange: () => alert('onChange clicked'),
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'Nombre del baúl',
    placeholder: 'Ej. Vacaciones en familia',
    value: '',
    helperText: 'Podés cambiarlo más adelante.',
    onChange: () => alert('onChange clicked'),
  },
};

export const Multiline: Story = {
  args: {
    label: 'Descripción',
    placeholder: 'Contanos un poco sobre este baúl...',
    value: '',
    multiline: true,
    rows: 4,
    onChange: () => alert('onChange clicked'),
  },
};

export const Interactive: Story = {
  args: {
    label: 'Nombre del baúl',
    value: '',
    onChange: () => alert('onChange clicked'),
  },
  render: function Render() {
    const [value, setValue] = useState('');
    return <Input label="Nombre del baúl" placeholder="Ej. Vacaciones en familia" value={value} onChange={setValue} />;
  },
};
