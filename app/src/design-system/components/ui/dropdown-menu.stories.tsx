import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/design-system/components/ui/dropdown-menu';
import { Icon } from '@/design-system/foundations/icons/Icon';
import { icons } from '@/design-system/foundations/icons/icons';
import { Button } from '@/design-system/components/actions/Button';

interface ActionMenuStoryArgs {
  onChangeCover: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const meta: Meta<ActionMenuStoryArgs> = {
  title: 'Components/UI/DropdownMenu',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Purpose
Radix-backed action menu wrapper for contextual commands that do not deserve persistent buttons.

### When to use
Use for secondary actions in screen headers and entity menus, especially chapter, baul, photo and person action sets.

### When NOT to use
Do not use for primary form actions, tab navigation or long multi-step decisions. Destructive items must remain explicit and separated from neutral actions.

### Typical examples
Changing a cover, editing metadata, reviewing requests, managing access or opening a destructive confirmation.

### Common mistakes
Using vague trigger labels, placing primary actions only inside the menu, omitting separators before destructive items or treating disabled items as selectable.

### Related components
\`PhotoViewerHeader\`, \`ChaptersView\`, \`PhotosView\` and \`PersonaDetailScreen\` compose this primitive for product action menus.
`,
      },
    },
  },
  args: {
    onChangeCover: fn(),
    onEdit: fn(),
    onDelete: fn(),
  },
};

export default meta;
type Story = StoryObj<ActionMenuStoryArgs>;

export const ChapterActions: Story = {
  render: (args) => (
    <div className="flex min-h-64 items-start justify-center bg-background p-10">
      <div className="flex w-72 items-center justify-between rounded-xl border border-border bg-card p-4">
        <div>
          <p className="text-sm font-medium text-foreground">Verano 2024</p>
          <p className="text-xs text-muted-foreground">24 fotos · 3 recuerdos</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="plain"
              type="button"
              aria-label="Abrir menú de capítulo"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Icon icon={icons.moreOptions} size="md" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Acciones de capítulo</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={args.onChangeCover}>
              <Icon icon={icons.photo} size="sm" aria-hidden />
              Cambiar portada
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={args.onEdit}>
              <Icon icon={icons.edit} size="sm" aria-hidden />
              Editar capítulo
              <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <Icon icon={icons.folder} size="sm" aria-hidden />
              Mover fotos
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={args.onDelete}>
              <Icon icon={icons.delete} size="sm" aria-hidden />
              Eliminar capítulo
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  ),
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);
    const trigger = canvas.getByRole('button', { name: 'Abrir menú de capítulo' });

    trigger.focus();
    await expect(trigger).toHaveFocus();
    await userEvent.keyboard('{Enter}');

    const menu = body.getByRole('menu');
    await expect(menu).toHaveAttribute('data-state', 'open');
    await expect(body.getByRole('menuitem', { name: /Cambiar portada/ })).toBeInTheDocument();
    await expect(body.getByRole('menuitem', { name: /Mover fotos/ })).toHaveAttribute('aria-disabled', 'true');
    await expect(body.getByRole('menuitem', { name: /Eliminar capítulo/ })).toHaveAttribute('data-variant', 'destructive');

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(menu).toHaveAttribute('data-state', 'closed'));
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    trigger.focus();
    await expect(trigger).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(body.getByRole('menu')).toHaveAttribute('data-state', 'open'));
    await userEvent.click(body.getByRole('menuitem', { name: /Editar capítulo/ }));
    await expect(args.onEdit).toHaveBeenCalled();
    await waitFor(() => expect(body.getByRole('menu')).toHaveAttribute('data-state', 'closed'));
  },
};

export const SelectionControls: Story = {
  render: () => {
    function SelectionControlsMenu() {
      const [showUndated, setShowUndated] = useState(true);
      const [density, setDensity] = useState('comfortable');

      return (
        <div className="flex min-h-64 items-start justify-center bg-background p-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="plain"
                type="button"
                className="rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Filtros de fotos
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>Vista</DropdownMenuLabel>
              <DropdownMenuCheckboxItem checked={showUndated} onCheckedChange={setShowUndated}>
                Mostrar fotos sin fecha
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Densidad</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={density} onValueChange={setDensity}>
                <DropdownMenuRadioItem value="compact">Compacta</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="comfortable">Cómoda</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    }

    return <SelectionControlsMenu />;
  },
};
