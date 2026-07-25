import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChevronLeft } from 'lucide-react';
import { StickyHeader } from '@/design-system/layouts/StickyHeader';
import { PageContainer } from '@/design-system/layouts/PageContainer';

const meta = {
  title: 'Layouts/StickyHeader',
  component: StickyHeader,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Shared sticky top bar shell used by every screen header (usually wrapping a ' +
          'PageContainer for horizontal alignment with the body below it). Scroll the canvas ' +
          'to see it stay pinned above the content.',
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
          <button className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors -ml-2">
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </button>
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
