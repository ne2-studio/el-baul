import type { Meta, StoryObj } from '@storybook/react-vite';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { viewportGlobals } from '@/storybook/viewports';

const meta = {
  title: 'Layouts/PageContainer',
  component: PageContainer,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          `
### Purpose
Shared horizontal rhythm and max width for top-level app content.

### When to use
Use around screen headers, body content, tab bars, upload confirmations and action bars so the app aligns consistently across routes.

### When NOT to use
Do not wrap individual cards or nested controls with it. Do not create a new page-width wrapper unless a screen truly needs a different composition.

### Typical examples
Baul lists, chapter tabs, chat header/body/input, upload confirmation, support screens and sharing screens.

### Common mistakes
Stacking containers inside containers, overriding the 62rem max width casually, or forgetting it in a \`StickyHeader\` so header and body no longer align.

### Related components
\`StickyHeader\` normally contains a \`PageContainer\`; feature screens compose \`PageContainer\` with \`EmptyState\`, forms, lists or media layouts.
`,
      },
    },
  },
} satisfies Meta<typeof PageContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <div className="bg-primary/10 border border-dashed border-primary/40 rounded-xl py-12 text-center text-muted-foreground">
        Contenido de la página — este bloque nunca crece más allá de 62rem, sin importar el
        ancho de la ventana.
      </div>
    ),
  },
};

const cardGrid = (
  <div className="bg-background min-h-screen py-6">
    <PageContainer>
      <div className="text-xs text-muted-foreground mb-4">
        El contenedor mantiene `px-6`; en desktop deja de crecer en `max-w-[62rem]`.
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <h3 className="font-serif text-xl text-foreground mb-1">Familia García</h3>
          <p className="text-sm text-muted-foreground">4 capítulos · actualizado hace 2 días</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <h3 className="font-serif text-xl text-foreground mb-1">Verano 2024</h3>
          <p className="text-sm text-muted-foreground">24 fotos · 3 recuerdos</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <h3 className="font-serif text-xl text-foreground mb-1">Navidad</h3>
          <p className="text-sm text-muted-foreground">12 fotos · 1 recuerdo</p>
        </div>
      </div>
    </PageContainer>
  </div>
);

export const ScreenRhythmMobile: Story = {
  args: {
    children: null,
  },
  render: () => cardGrid,
  globals: viewportGlobals.mobile,
};

export const ScreenRhythmNarrow: Story = {
  args: {
    children: null,
  },
  render: () => cardGrid,
  globals: viewportGlobals.narrow,
};

export const ScreenRhythmDesktopMaxWidth: Story = {
  args: {
    children: null,
  },
  render: () => cardGrid,
  globals: viewportGlobals.desktop,
};
