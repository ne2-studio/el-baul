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
Use for simple controlled text values with a visible label, placeholder and optional helper text. Use \`multiline\` for descriptions, biography-like content, support messages and memory text.

### When NOT to use
Do not use for dates, option sets, photos, permissions or domain-specific selectors. Do not hide the label and rely only on placeholder text.

### Typical examples
Baul name, baul description, editable person or profile information, support form text, destructive reason fields and modal edit fields.

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

export const PhotoViewerMemory: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Dark, transparent multiline variant used by `RecuerdoInput` inside the photo viewer. It keeps the field behavior in `Input` while the surrounding component owns focus animation and the inline send button.',
      },
    },
  },
  decorators: [(Story) => <div className="bg-foreground p-6"><Story /></div>],
  args: {
    placeholder: '¿Qué recuerdas de este momento?',
    value: '',
    multiline: true,
    rows: 1,
    variant: 'photoViewerMemory',
    onChange: () => alert('onChange clicked'),
  },
};

export const Modal: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Soft secondary field used inside bottom sheet forms. Use for compact edit/create modals where the sheet already provides the main surface.',
      },
    },
  },
  args: {
    label: 'Apodo',
    placeholder: 'Ej. Abuela, Tío Juan…',
    value: '',
    variant: 'modal',
    onChange: () => alert('onChange clicked'),
  },
};

export const SupportTextarea: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Large text area for support or request flows where the user needs room to explain context.',
      },
    },
  },
  args: {
    placeholder: 'Cuéntanos qué ha pasado o cómo podemos ayudarte.',
    value: '',
    multiline: true,
    rows: 5,
    variant: 'support',
    onChange: () => alert('onChange clicked'),
  },
};

export const DestructiveReason: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Reason field used next to irreversible actions. Pair it with destructive copy or a Notice so the field does not carry the warning alone.',
      },
    },
  },
  args: {
    label: 'Motivo de la retirada',
    placeholder: '¿Por qué se retira esta foto?',
    value: '',
    multiline: true,
    rows: 3,
    variant: 'destructive',
    onChange: () => alert('onChange clicked'),
  },
};

export const InlineDark: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Inline edit field for dark media surfaces. Use only where a normal card field would clash with an on-image or fullscreen context.',
      },
    },
  },
  decorators: [(Story) => <div className="bg-foreground p-6"><Story /></div>],
  args: {
    value: 'Un recuerdo escrito sobre una foto.',
    multiline: true,
    rows: 4,
    variant: 'inlineDark',
    'aria-label': 'Contenido del recuerdo',
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
