import type { Meta, StoryObj } from '@storybook/react-vite';
import { BookOpen, ExternalLink, LogOut, User } from 'lucide-react';
import { ActionListItem } from '@/design-system/components/data-display/ActionListItem';

const meta = {
  title: 'Components/DataDisplay/ActionListItem',
  component: ActionListItem,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Purpose
Large tappable action row with an icon, title and optional supporting text.

### When to use
Use it for account menus, support options and other navigational/action lists where the row explains the destination.

### When NOT to use
Do not use it for selectable state, dense dropdown menus, batch toolbars or primary form submit buttons.

### Variants
\`plain\` is for modal/menu surfaces, \`card\` is for page-level option lists, and \`destructive\` is for actions such as signing out or deleting access.
`,
      },
    },
  },
} satisfies Meta<typeof ActionListItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Plain: Story = {
  args: {
    icon: <User className="h-5 w-5" aria-hidden />,
    title: 'Mi perfil',
    description: 'Información de tu cuenta',
  },
};

export const Card: Story = {
  args: {
    variant: 'card',
    icon: <BookOpen className="h-5 w-5" aria-hidden />,
    title: 'Centro de ayuda',
    description: 'Preguntas frecuentes y guías',
    trailing: <ExternalLink className="h-4 w-4" aria-hidden />,
  },
};

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    icon: <LogOut className="h-5 w-5" aria-hidden />,
    title: 'Cerrar sesión',
  },
};
