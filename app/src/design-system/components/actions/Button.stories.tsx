import type { Meta, StoryObj } from '@storybook/react-vite';
import { SendHorizontal, Sparkles } from 'lucide-react';
import { Button } from '@/design-system/components/actions/Button';

const meta = {
  title: 'Components/Actions/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Purpose
Action primitive for clear, explicit commands in forms, empty states, modals and screen headers.

### When to use
Use \`primary\` for the main next/save/upload action, \`secondary\` for neutral alternatives, \`ghost\` for low-emphasis navigation such as "Omitir", and \`danger\` for destructive or access-removal actions.

### When NOT to use
Do not use it as a card, tab, menu item or floating action button; those patterns already have their own components. Avoid multiple competing primary buttons in the same decision area.

### Typical examples
Creating a baul, continuing onboarding, saving modal changes, retrying an upload, removing access or confirming deletion.

### Common mistakes
Using \`danger\` for non-destructive emphasis, forgetting \`aria-label\` on icon-only buttons, or using loading text without \`isLoading\`.

### Related components
\`FAB\` for persistent floating creation actions, \`TabButton\` for section switching, \`BottomSheetModal\` for modal action groups.
`,
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'danger'],
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    children: 'Crear baúl',
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Cancelar',
    variant: 'secondary',
  },
};

export const Ghost: Story = {
  args: {
    children: 'Omitir',
    variant: 'ghost',
  },
};

export const Danger: Story = {
  args: {
    children: 'Quitar acceso',
    variant: 'danger',
  },
};

export const Loading: Story = {
  args: {
    children: 'Subiendo...',
    variant: 'primary',
    isLoading: true,
  },
};

export const Disabled: Story = {
  args: {
    children: 'No disponible',
    variant: 'primary',
    disabled: true,
  },
};

export const FullWidth: Story = {
  args: {
    children: 'Continuar',
    variant: 'primary',
    fullWidth: true,
  },
};

export const WithLeftIcon: Story = {
  args: {
    children: 'Recordemos juntos',
    variant: 'primary',
    leftIcon: <Sparkles className="h-4 w-4" aria-hidden />,
  },
};

export const IconOnly: Story = {
  args: {
    variant: 'primary',
    iconOnly: true,
    'aria-label': 'Enviar',
    children: <SendHorizontal className="h-5 w-5" aria-hidden />,
  },
};

export const AllVariantsWithIcons: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="primary" leftIcon={<Sparkles className="h-4 w-4" aria-hidden />}>Primario</Button>
      <Button variant="secondary" leftIcon={<Sparkles className="h-4 w-4" aria-hidden />}>Secundario</Button>
      <Button variant="ghost" leftIcon={<Sparkles className="h-4 w-4" aria-hidden />}>Ghost</Button>
      <Button variant="danger" leftIcon={<Sparkles className="h-4 w-4" aria-hidden />}>Danger</Button>
      <Button variant="primary" iconOnly aria-label="Enviar">
        <SendHorizontal className="h-5 w-5" aria-hidden />
      </Button>
      <Button variant="secondary" iconOnly aria-label="Enviar">
        <SendHorizontal className="h-5 w-5" aria-hidden />
      </Button>
      <Button variant="ghost" iconOnly aria-label="Enviar">
        <SendHorizontal className="h-5 w-5" aria-hidden />
      </Button>
      <Button variant="danger" iconOnly aria-label="Enviar">
        <SendHorizontal className="h-5 w-5" aria-hidden />
      </Button>
    </div>
  ),
};
