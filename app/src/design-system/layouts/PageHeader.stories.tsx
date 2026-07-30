import type { Meta, StoryObj } from '@storybook/react-vite';
import { CheckSquare, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '@/design-system/layouts/PageHeader';
import { Button } from '@/design-system/components/actions/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/design-system/components/ui/dropdown-menu';

const meta = {
  title: 'Layouts/PageHeader',
  component: PageHeader,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          `
### Purpose
Shared header for screens with a back action, keeping spacing, back-button shape and title alignment consistent.

### When to use
Use on app screens that need to return to a previous context. Pick the visual variant, not a screen-specific copy:
- **stacked**: back link above title for creation and form flows.
- **inline**: circular icon-only back button beside title for settings and detail screens.
- **row**: back link plus trailing actions; the title lives in a hero/content block below.

### When NOT to use
Do not use a bare \`StickyHeader\`/\`PageContainer\` combo for a normal back header. Do not add a title to \`row\`; that variant intentionally delegates title to the content below.

### Typical examples
Creation forms, profile/settings screens, and content browsing screens with contextual menus or selection counters.

### Common mistakes
Creating one story per consuming screen, hard-coding custom back buttons, or duplicating row menus instead of using the \`trailing\` slot.
`,
      },
    },
  },
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Stacked: Story = {
  args: {
    variant: 'stacked',
    onBack: () => alert('onBack clicked'),
    title: 'Nuevo capítulo',
  },
};

export const StackedWithSubtitle: Story = {
  args: {
    variant: 'stacked',
    onBack: () => alert('onBack clicked'),
    backLabel: 'Cancelar',
    title: 'Compartir 3 fotos',
    subtitle: 'Elige a qué baúl quieres añadirlas',
  },
};

export const Inline: Story = {
  args: {
    variant: 'inline',
    onBack: () => alert('onBack clicked'),
    title: 'Mi perfil',
  },
};

export const InlineWithSubtitle: Story = {
  args: {
    variant: 'inline',
    onBack: () => alert('onBack clicked'),
    title: 'Solicitudes de retirada',
    titleClassName: 'font-serif text-xl',
    subtitle: '3 solicitudes pendientes',
  },
};

export const Row: Story = {
  args: {
    variant: 'row',
    onBack: () => alert('onBack clicked'),
  },
};

export const RowWithMenu: Story = {
  args: {
    variant: 'row',
    onBack: () => alert('onBack clicked'),
    trailing: (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" iconOnly aria-label="Opciones del capítulo">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem>
            <CheckSquare className="w-4 h-4 mr-2" />
            Seleccionar fotos
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Pencil className="w-4 h-4 mr-2" />
            Editar información
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive">
            <Trash2 className="w-4 h-4 mr-2" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
};

export const RowSelectionMode: Story = {
  args: {
    variant: 'row',
    onBack: () => alert('onBack clicked'),
    backLabel: 'Cancelar',
    trailing: <span className="text-sm font-medium text-foreground">3 seleccionadas</span>,
  },
};
