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
          'Shared width constraint used by every top-level screen (max-w-[62rem], centered, ' +
          'px-6) so screens line up visually. Widen the canvas past ~62rem to see the content ' +
          'stop growing and stay centered instead of stretching edge to edge.',
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
