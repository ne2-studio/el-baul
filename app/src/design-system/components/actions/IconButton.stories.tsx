import type { Meta, StoryObj } from '@storybook/react-vite';
import { MoreVertical, X } from 'lucide-react';
import { IconButton } from '@/design-system/components/actions/IconButton';

const meta = {
  title: 'Components/Actions/IconButton',
  component: IconButton,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Purpose
Circular icon-only action for headers, compact menus and media overlays.

### When to use
Use it when the visible label would be redundant and the icon represents a familiar single action such as close, back, more options or previous/next.

### When NOT to use
Do not use it for primary text actions, long labels, tabs or repeated card content. Icon-only buttons must always have an accessible label.

### Variants
\`default\` is for light app surfaces. \`inverse\` is for fullscreen photo/video surfaces where the control sits over dark media.
`,
      },
    },
  },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    'aria-label': 'Más opciones',
    children: <MoreVertical className="h-5 w-5" aria-hidden />,
  },
};

export const WithBadgeDot: Story = {
  args: {
    'aria-label': 'Más opciones con solicitudes pendientes',
    badgeDot: true,
    children: <MoreVertical className="h-5 w-5" aria-hidden />,
  },
};

export const Inverse: Story = {
  decorators: [(Story) => <div className="bg-foreground p-6"><Story /></div>],
  args: {
    tone: 'inverse',
    'aria-label': 'Cerrar',
    children: <X className="h-5 w-5" aria-hidden />,
  },
};
