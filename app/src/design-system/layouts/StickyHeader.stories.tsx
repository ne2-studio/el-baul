import type { Meta, StoryObj } from '@storybook/react-vite';
import { StickyHeader } from '@/design-system/layouts/StickyHeader';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { BackButton } from '@/design-system/components/navigation/BackButton';

const meta = {
  title: 'Layouts/StickyHeader',
  component: StickyHeader,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          `
### Purpose
Sticky top bar shell that keeps route context and back/actions visible while content scrolls.

### When to use
Use for real app screens with a title, back button, contextual menu, tabs below, or persistent upload/chat/navigation context.

### When NOT to use
Do not use inside cards, modals, or small embedded sections. Avoid it for transient overlays; \`BottomSheetModal\` owns those surfaces.

### Typical examples
Create baul, chapters view, photo upload confirmation, share target selection, support and AI chat screens.

### Common mistakes
Not wrapping the header contents in \`PageContainer\`, placing too much dense content in the sticky area, or using it as a generic border/background band.

### Related components
\`PageContainer\` for alignment, \`Button\` or icon buttons for actions, \`TabButton\` for section navigation directly below or inside screen headers.
`,
      },
    },
  },
} satisfies Meta<typeof StickyHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: null,
  },
  render: () => (
    <div className="min-h-screen bg-background">
      <StickyHeader>
        <PageContainer className="py-5 flex items-center gap-4">
          <BackButton onClick={() => alert('back clicked')} />
          <h1 className="text-3xl text-foreground">Título de la pantalla</h1>
        </PageContainer>
      </StickyHeader>
      <PageContainer className="py-8 space-y-4">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl px-4 py-4">
            Elemento de contenido {i + 1}
          </div>
        ))}
      </PageContainer>
    </div>
  ),
};
