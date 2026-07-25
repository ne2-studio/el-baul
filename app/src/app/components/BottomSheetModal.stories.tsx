import type { Meta, StoryObj } from '@storybook/react-vite';
import { BottomSheetModal } from './BottomSheetModal';

const meta = {
  title: 'Components/Overlays/BottomSheetModal',
  component: BottomSheetModal,
  tags: ['autodocs'],
} satisfies Meta<typeof BottomSheetModal>;

export default meta;
type Story = StoryObj<typeof meta>;

const placeholderContent = (
  <>
    <h2 className="text-lg font-semibold text-foreground mb-2">Título de la hoja</h2>
    <p className="text-muted-foreground">
      Este es el shell compartido por todos los modales de tipo "bottom sheet" de la
      aplicación. El contenido real (formularios, listas, confirmaciones) lo aporta cada
      modal concreto.
    </p>
  </>
);

export const Small: Story = {
  args: {
    onCancel: () => alert('onCancel clicked'),
    children: placeholderContent,
  },
};

export const SmallDesktopCentered: Story = {
  args: {
    ...Small.args,
    desktopCentered: true,
  },
};

export const Large: Story = {
  args: {
    onCancel: () => alert('onCancel clicked'),
    size: 'lg',
    children: placeholderContent,
  },
};
