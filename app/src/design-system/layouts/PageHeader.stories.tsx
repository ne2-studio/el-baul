import type { Meta, StoryObj } from '@storybook/react-vite';
import { Camera, CheckSquare, ImageIcon, MoreVertical, Pencil, Trash2 } from 'lucide-react';
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
The one header every screen with a back button should render — fixes the vertical padding,
back-button shape/icon size and optical alignment in a single place, instead of every screen
hand-rolling its own \`StickyHeader\`/\`PageContainer\`/back-button combo (which is exactly how
the app ended up with several slightly different header heights and back-button positions).

### When to use
Any screen that needs a back button. Pick the variant that matches the screen's shape:
- **stacked**: back link above an \`h1\` — creation/form screens.
- **inline**: circular icon-only back button beside an \`h1\` — detail/settings screens.
- **row**: back link + a \`trailing\` slot (menu, selection badge), no title of its own because
  the title lives in a \`Hero\` rendered below — content-browsing screens.

### When NOT to use
Don't reach for a bare \`StickyHeader\`/\`PageContainer\` for a screen that has a back button —
that's the exact pattern that drifted into inconsistent headers before this component existed.

### Related components
\`BackButton\` (composed internally), \`StickyHeader\`/\`PageContainer\` (the shell), \`Hero\` (owns
the title for 'row' screens).
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

export const Inline: Story = {
  args: {
    variant: 'inline',
    onBack: () => alert('onBack clicked'),
    title: 'Mi perfil',
  },
};

export const Row: Story = {
  args: {
    variant: 'row',
    onBack: () => alert('onBack clicked'),
  },
};

// ─── Usos reales de cada pantalla ────────────────────────────────────────────────────

// Variante 'stacked' — pantallas de creación/formulario

export const CreateChapterForm: Story = {
  args: {
    variant: 'stacked',
    onBack: () => alert('onBack clicked'),
    title: 'Nuevo capítulo',
  },
};

export const CreateBaulForm: Story = {
  args: {
    variant: 'stacked',
    onBack: () => alert('onBack clicked'),
    title: 'Crear un baúl',
  },
};

export const CreateBaulFormOnboarding: Story = {
  args: {
    variant: 'stacked',
    onBack: () => alert('onBack clicked'),
    title: 'Crea tu primer baúl',
  },
};

export const ShareTargetBaulScreen: Story = {
  args: {
    variant: 'stacked',
    onBack: () => alert('onBack (cancelar) clicked'),
    backLabel: 'Cancelar',
    title: 'Compartir 3 fotos',
    subtitle: 'Elige a qué baúl quieres añadirlas',
  },
};

export const UploadConfirmationScreen: Story = {
  args: {
    variant: 'stacked',
    onBack: () => alert('onBack clicked'),
    title: 'Añadir fotos al capítulo',
    subtitle: 'Verano 2024',
  },
};

// Variante 'inline' — pantallas de detalle/ajustes

export const PaymentPlaceholderScreen: Story = {
  args: {
    variant: 'inline',
    onBack: () => alert('onBack clicked'),
    title: 'Pago seguro',
  },
};

export const RequestBaulDeletionScreen: Story = {
  args: {
    variant: 'inline',
    onBack: () => alert('onBack clicked'),
    title: 'Eliminar baúl',
  },
};

export const SupportFormScreen: Story = {
  args: {
    variant: 'inline',
    onBack: () => alert('onBack clicked'),
    title: 'Informar de un problema',
  },
};

export const MiPerfilScreen: Story = {
  args: {
    variant: 'inline',
    onBack: () => alert('onBack clicked'),
    title: 'Mi perfil',
  },
};

export const NotificationPreferencesScreen: Story = {
  args: {
    variant: 'inline',
    onBack: () => alert('onBack clicked'),
    title: 'Notificaciones',
  },
};

export const PlanSelectionScreen: Story = {
  args: {
    variant: 'inline',
    onBack: () => alert('onBack clicked'),
    title: 'Elige tu plan',
  },
};

export const HelpSupportScreen: Story = {
  args: {
    variant: 'inline',
    onBack: () => alert('onBack clicked'),
    title: 'Ayuda y soporte',
  },
};

export const MiSuscripcionScreen: Story = {
  args: {
    variant: 'inline',
    onBack: () => alert('onBack clicked'),
    title: 'Mi suscripción',
  },
};

export const AiChatScreen: Story = {
  args: {
    variant: 'inline',
    onBack: () => alert('onBack clicked'),
    title: 'Ayúdame a recordar',
    titleClassName: 'text-2xl',
  },
};

export const RemovalRequestsList: Story = {
  args: {
    variant: 'inline',
    onBack: () => alert('onBack clicked'),
    title: 'Solicitudes de retirada',
    titleClassName: 'font-serif text-xl',
    subtitle: '3 solicitudes pendientes',
  },
};

// Variante 'row' — pantallas de navegación de contenido con acciones contextuales
// (el título vive en el `Hero` que se renderiza debajo, ver Hero.stories.tsx)

export const PhotosView: Story = {
  args: {
    variant: 'row',
    onBack: () => alert('onBack clicked'),
    trailing: (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="plain"
            className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-secondary"
            aria-label="Opciones del capítulo"
          >
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
            Editar información del capítulo
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive">
            <Trash2 className="w-4 h-4 mr-2" />
            Eliminar capítulo
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
};

export const PhotosViewSelectionMode: Story = {
  args: {
    variant: 'row',
    onBack: () => alert('onBack (exitSelection) clicked'),
    backLabel: 'Cancelar',
    trailing: <span className="text-sm font-medium text-foreground">3 seleccionadas</span>,
  },
};

export const ChaptersView: Story = {
  args: {
    variant: 'row',
    onBack: () => alert('onBack clicked'),
    trailing: (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="plain"
            className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-secondary"
            aria-label="Opciones del baúl"
          >
            <MoreVertical className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem>
            <ImageIcon className="w-4 h-4 mr-2" />
            Elegir foto de portada
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Pencil className="w-4 h-4 mr-2" />
            Editar información del baúl
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">
            <Trash2 className="w-4 h-4 mr-2" />
            Eliminar baúl
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
};

export const PersonaDetailScreen: Story = {
  args: {
    variant: 'row',
    onBack: () => alert('onBack clicked'),
    trailing: (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="plain"
            className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-secondary"
            aria-label="Opciones de la persona"
          >
            <MoreVertical className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem>
            <Pencil className="w-4 h-4 mr-2" />
            Editar información
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Camera className="w-4 h-4 mr-2" />
            Cambiar foto de perfil
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
};
