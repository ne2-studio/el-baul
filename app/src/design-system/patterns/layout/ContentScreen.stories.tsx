import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { BookImage, ImageIcon, Users } from 'lucide-react';
import { PageHeader } from '@/design-system/layouts/PageHeader';
import { Hero } from '@/design-system/layouts/Hero';
import { Tabbar } from '@/design-system/layouts/Tabbar';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { EmptyState } from '@/design-system/components/feedback/EmptyState';
import { useElementHeight } from '@/hooks/useElementHeight';
import { storybookPhotos } from '@/storybook/fixtures';

// Story de documentación, no de un componente aislado: no existe (deliberadamente) un
// componente "ContentScreen" — este patrón es la combinación de 4 piezas ya extraídas
// (PageHeader + Hero + Tabbar + PageContainer), y este archivo documenta cómo se combinan,
// igual que las usan de verdad ChaptersView.tsx, PhotosView.tsx y PersonaDetailScreen.tsx.
const meta = {
  title: 'Patterns/Layout/ContentScreen',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
### Purpose
The shared screen template behind every top-level content view: \`PageHeader\` (row variant)
+ \`Hero\` + \`Tabbar\` + \`PageContainer\`. It is not itself a component — there is no
\`ContentScreen.tsx\` to import — it is the composition pattern documented in
\`docs/DESIGN.md\` under "Content screen composition".

### When to use
Any screen that browses a piece of family content with more than one section: today
Baúl (\`ChaptersView.tsx\`), Capítulo (\`PhotosView.tsx\`) and Persona
(\`PersonaDetailScreen.tsx\`). Reuse it for future top-level content views (e.g. Lugares)
instead of hand-rolling a new header/hero/tabs combination.

### When NOT to use
Single-section screens with a title don't need a \`Hero\`/\`Tabbar\` — use \`PageHeader\`
with \`variant="stacked"\` or \`"inline"\` directly. Forms and settings screens fall in
that category, not this pattern.

### Composition
1. \`PageHeader variant="row"\` — back button + \`trailing\` menu/actions, no title of its own.
2. \`Hero\` — cover image/gradient carrying the screen title.
3. \`Tabbar\` — sticky tabs offset below the header's measured height, with swipe.
4. \`PageContainer\` — the actual per-tab content.

### Related components
\`PageHeader\`, \`Hero\`, \`Tabbar\`, \`PageContainer\` — see each for their own props and stories.
`,
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function ContentScreenDemo() {
  const [headerRef, headerHeight] = useElementHeight<HTMLDivElement>();
  const [active, setActive] = useState('capitulos');

  return (
    <div className="min-h-screen bg-background">
      <PageHeader ref={headerRef} variant="row" onBack={() => alert('onBack clicked')} />

      <Hero imageUrl={storybookPhotos.familyCover} title="Familia García">
        <p className="text-sm text-white/80 mt-1.5 leading-snug max-w-sm">
          Nuestros mejores momentos, todos juntos
        </p>
      </Hero>

      <Tabbar
        tabs={[
          { key: 'capitulos', label: 'Capítulos', count: 5 },
          { key: 'recuerdos', label: 'Recuerdos', count: 3 },
          { key: 'personas', label: 'Personas', count: 4 },
        ]}
        active={active}
        onChange={setActive}
        top={headerHeight}
      >
        <PageContainer className="py-8">
          {active === 'capitulos' && (
            <EmptyState icon={<BookImage className="w-20 h-20" strokeWidth={1.5} />} title="Capítulos" subtitle="Contenido del tab Capítulos" />
          )}
          {active === 'recuerdos' && (
            <EmptyState icon={<ImageIcon className="w-20 h-20" strokeWidth={1.5} />} title="Recuerdos" subtitle="Contenido del tab Recuerdos" />
          )}
          {active === 'personas' && (
            <EmptyState icon={<Users className="w-20 h-20" strokeWidth={1.5} />} title="Personas" subtitle="Contenido del tab Personas" />
          )}
        </PageContainer>
      </Tabbar>
    </div>
  );
}

export const Default: Story = {
  render: () => <ContentScreenDemo />,
};
