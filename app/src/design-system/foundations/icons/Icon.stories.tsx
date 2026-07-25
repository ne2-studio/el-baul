import type { Meta, StoryObj } from '@storybook/react-vite';
import { Icon, type IconSize } from '@/design-system/foundations/icons/Icon';
import { icons } from '@/design-system/foundations/icons/icons';
import { Button } from '@/design-system/components/actions/Button';

const meta = {
  title: 'Foundations/Icons/Icon',
  component: Icon,
  tags: ['autodocs'],
  args: {
    icon: icons.heart,
    'aria-hidden': true,
  },
  parameters: {
    docs: {
      description: {
        component:
          'Base component every icon in the app should render through. Wraps a lucide icon component, applies the semantic size scale, and forces a deliberate accessibility choice: pass `aria-hidden` for decorative icons or `aria-label` for icons that carry meaning on their own. Color always comes from `currentColor`, inherited from the surrounding text.',
      },
    },
  },
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    icon: icons.heart,
    'aria-label': 'Favorito',
  },
};

const SIZES: IconSize[] = ['xs', 'sm', 'md', 'lg', 'xl'];

export const Sizes: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'The five semantic sizes. Use `size` instead of a raw `w-*`/`h-*` className; an explicit className is only for the rare one-off case.',
      },
    },
  },
  render: () => (
    <div className="flex flex-wrap items-end gap-8">
      {SIZES.map((size) => (
        <div key={size} className="flex flex-col items-center gap-2">
          <Icon icon={icons.bookImage} size={size} aria-hidden />
          <span className="text-sm text-muted-foreground">{size}</span>
        </div>
      ))}
    </div>
  ),
};

export const Colors: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Icons never carry their own color palette - they use `currentColor`, so they pick up whatever text color class wraps them. Only tokens that already exist in the theme are shown; the app has no `success`/`warning` tokens yet, only `destructive` for the danger case.',
      },
    },
  },
  render: () => (
    <div className="flex flex-wrap items-center gap-8">
      <div className="flex flex-col items-center gap-2">
        <span className="text-primary">
          <Icon icon={icons.heart} size="lg" aria-hidden />
        </span>
        <span className="text-sm text-muted-foreground">text-primary</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <span className="text-muted-foreground">
          <Icon icon={icons.info} size="lg" aria-hidden />
        </span>
        <span className="text-sm text-muted-foreground">text-muted-foreground</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <span className="text-destructive">
          <Icon icon={icons.alertTriangle} size="lg" aria-hidden />
        </span>
        <span className="text-sm text-muted-foreground">text-destructive</span>
      </div>
    </div>
  ),
};

export const Decorative: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'When the icon accompanies a visible text label, its meaning is already conveyed - it should be `aria-hidden` so assistive tech skips it instead of announcing a redundant, unnamed icon.',
      },
    },
  },
  render: () => (
    <p className="flex items-center gap-2 text-foreground">
      <Icon icon={icons.check} aria-hidden />
      Guardado correctamente
    </p>
  ),
};

export const Accessible: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Use `aria-label` (never `title`) when the icon is the only thing conveying meaning - typically an icon with no adjacent text. This pattern is for a standalone informative icon; for an icon-only *button*, name the button itself instead (see "Inside buttons" below).',
      },
    },
  },
  render: () => (
    <div className="flex items-center gap-2 text-destructive">
      <Icon icon={icons.alertTriangle} aria-label="Advertencia" />
      <span>Esta acción no se puede deshacer</span>
    </div>
  ),
};

export const WithText: Story = {
  render: () => (
    <div className="flex flex-col gap-4 text-foreground">
      <span className="inline-flex items-center gap-1.5">
        <Icon icon={icons.calendar} size="sm" aria-hidden />
        12 de julio de 2026
      </span>
      <span className="inline-flex items-center gap-1.5">
        Ver todos los recuerdos
        <Icon icon={icons.chevronRight} size="sm" aria-hidden />
      </span>
      <h3 className="flex items-center gap-2 font-serif">
        <Icon icon={icons.bookOpen} size="lg" aria-hidden />
        Verano en la playa
      </h3>
      <p className="flex items-start gap-2 text-sm text-muted-foreground max-w-xs">
        <Icon icon={icons.info} size="sm" aria-hidden className="mt-0.5 shrink-0" />
        Este baúl se comparte con 3 personas más y cualquiera puede añadir fotos o
        recuerdos nuevos.
      </p>
    </div>
  ),
};

export const InsideButtons: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Icons inside `Button` reuse the real component. An icon-only button must get its accessible name from `Button`\'s own `aria-label`, not from the icon.',
      },
    },
  },
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Button variant="primary">
        <Icon icon={icons.add} aria-hidden />
        Añadir fotografía
      </Button>
      <Button variant="secondary" aria-label="Eliminar fotografía" className="px-3">
        <Icon icon={icons.delete} aria-hidden />
      </Button>
      <Button variant="secondary" disabled>
        <Icon icon={icons.upload} aria-hidden />
        Subir
      </Button>
      <Button variant="danger">
        <Icon icon={icons.delete} aria-hidden />
        Eliminar baúl
      </Button>
    </div>
  ),
};

export const Disabled: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'The icon does not manage its own disabled color - it inherits `currentColor` and the parent\'s `opacity-50`, exactly like the text next to it.',
      },
    },
  },
  render: () => (
    <Button variant="secondary" disabled>
      <Icon icon={icons.download} aria-hidden />
      Descargar copia
    </Button>
  ),
};
