import type { Meta, StoryObj } from '@storybook/react-vite';
import { Plus } from 'lucide-react';
import { SelectionRow } from '@/design-system/components/data-display/SelectionRow';

const meta = {
  title: 'Components/DataDisplay/SelectionRow',
  component: SelectionRow,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Purpose
Selectable row for modal lists where the whole row acts as the control.

### When to use
Use it for choosing one destination, selecting several people, or presenting a create/new option alongside existing options.

### When NOT to use
Do not use it as generic navigation or a settings menu item. Use \`ActionListItem\` for action rows and \`Select\` for compact option sets.

### Variants
\`radio\` marks a single choice. \`checkbox\` marks multi-selection. \`none\` is reserved for rows that provide their own visual indicator.
`,
      },
    },
  },
} satisfies Meta<typeof SelectionRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Radio: Story = {
  args: {
    selected: true,
    children: <span className="text-sm text-foreground">Verano de 1986</span>,
  },
};

export const Checkbox: Story = {
  args: {
    selected: true,
    control: 'checkbox',
    controlPosition: 'right',
    children: <span className="text-sm text-foreground">María</span>,
  },
};

export const WithLeadingIcon: Story = {
  args: {
    selected: false,
    leading: <Plus className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />,
    children: <span className="text-sm text-foreground">Crear un capítulo nuevo</span>,
  },
};
