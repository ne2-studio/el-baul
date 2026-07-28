import type { Meta, StoryObj } from '@storybook/react-vite';
import { PageContainer } from '@/design-system/layouts/PageContainer';

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
