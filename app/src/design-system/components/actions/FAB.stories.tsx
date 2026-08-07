import type { Meta, StoryObj } from '@storybook/react-vite';
import { Plus, Upload, Sparkles } from 'lucide-react';
import { SimpleFAB, ExpandableFAB } from '@/design-system/components/actions/FAB';

const meta = {
  title: 'Components/Actions/FAB',
  component: SimpleFAB,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
### Purpose
Persistent floating creation action for long, scrollable screens where the primary CTA must stay reachable.

### When to use
Use \`SimpleFAB\` for one protagonist CTA on a screen, such as creating a baúl, uploading photos or editing a biography. Use \`ExpandableFAB\` when two or more CTAs would otherwise compete for the same fixed position.

### When NOT to use
Do not use for secondary actions, destructive actions, short modal forms or dense toolbars. Do not stack several simple FABs.

### Typical examples
\`SimpleFAB\`: "Nuevo baúl", "Subir fotos", "Editar biografía". \`ExpandableFAB\`: "Nuevo capítulo" plus "Subir fotos".

### Common mistakes
Using a FAB for an action that only applies to one card, hiding the only way to complete a form behind a FAB, or keeping it visible during selection mode.
`,
      },
    },
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

export const SimpleWithIcon: Story = {
  args: {
    label: 'Subir fotos',
    icon: <Plus className="w-5 h-5" />,
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
      ]}
    />
  ),
};

export const ThreeActions: Story = {
  args: {
    label: 'unused',
    onClick: () => {},
  },
  render: () => (
    <ExpandableFAB
      actions={[
        { label: 'Nuevo capítulo', icon: <Plus className="w-4 h-4" />, onClick: () => alert('Nuevo capítulo') },
        { label: 'Subir fotos', icon: <Upload className="w-4 h-4" />, onClick: () => alert('Subir fotos') },
        { label: 'Recordemos juntos', icon: <Sparkles className="w-4 h-4" />, onClick: () => alert('Recordemos juntos') },
      ]}
    />
  ),
};
