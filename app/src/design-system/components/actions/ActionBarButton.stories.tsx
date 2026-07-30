import type { Meta, StoryObj } from '@storybook/react-vite';
import { Calendar, FolderInput, Plus, Tag } from 'lucide-react';
import { ActionBarButton } from '@/design-system/components/actions/ActionBarButton';

const meta = {
  title: 'Components/Actions/ActionBarButton',
  component: ActionBarButton,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Purpose
Compact vertical action used in persistent toolbars, especially batch photo actions on mobile.

### When to use
Use it for a small set of peer actions where icon and short label must stay scannable in a horizontal bar.

### When NOT to use
Do not use it inside forms, modal footers or regular page content. Prefer \`Button\` for normal commands and \`IconButton\` when there is no visible text.
`,
      },
    },
  },
} satisfies Meta<typeof ActionBarButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    icon: <Calendar aria-hidden />,
    children: 'Cambiar fecha',
  },
};

export const BatchActions: Story = {
  args: {
    icon: <Calendar aria-hidden />,
    children: 'Cambiar fecha',
  },
  render: () => (
    <div className="flex gap-2 overflow-x-auto">
      <ActionBarButton icon={<Calendar aria-hidden />}>Cambiar fecha</ActionBarButton>
      <ActionBarButton icon={<FolderInput aria-hidden />}>Mover</ActionBarButton>
      <ActionBarButton icon={<Plus aria-hidden />}>Crear capítulo</ActionBarButton>
      <ActionBarButton icon={<Tag aria-hidden />}>Etiquetar personas</ActionBarButton>
    </div>
  ),
};
