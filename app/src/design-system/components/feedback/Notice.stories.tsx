import type { Meta, StoryObj } from '@storybook/react-vite';
import { AlertTriangle, Heart, Info } from 'lucide-react';
import { Notice } from '@/design-system/components/feedback/Notice';

const meta = {
  title: 'Design System/Feedback/Notice',
  component: Notice,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof Notice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Neutral: Story = {
  args: {
    children: 'Tu plan define cuántos baúles puedes custodiar y el espacio disponible para guardar tus recuerdos.',
  },
};

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: (
      <>
        <span className="font-semibold">Atención:</span> esta acción no se puede deshacer.
      </>
    ),
  },
};

export const WithIcon: Story = {
  args: {
    icon: <Info className="w-4 h-4 text-muted-foreground" />,
    children: 'Recopilaremos algunos datos técnicos para poder ayudarte más rápido.',
  },
};

export const DestructiveWithIcon: Story = {
  args: {
    variant: 'destructive',
    icon: <AlertTriangle className="w-4 h-4 text-destructive" />,
    children: (
      <>
        Eliminar el baúl <span className="font-semibold">Familia García</span> afecta a todas las personas que
        tienen acceso a él y conlleva la pérdida definitiva de sus fotos y recuerdos.
      </>
    ),
  },
};

export const CustomIconColor: Story = {
  args: {
    icon: <Heart className="w-5 h-5 text-primary" />,
    children: 'Actualiza tu plan para seguir guardando recuerdos importantes y compartirlos con las personas que amas.',
  },
};

export const Small: Story = {
  args: {
    variant: 'destructive',
    size: 'sm',
    children: (
      <>
        <span className="font-semibold">Atención:</span> 17 fotos y 9 recuerdos quedarán sueltos en el baúl. ¿Estás seguro?
      </>
    ),
  },
};

export const Centered: Story = {
  args: {
    align: 'center',
    children: 'Esta información se toma de tu cuenta de Google.',
  },
};
