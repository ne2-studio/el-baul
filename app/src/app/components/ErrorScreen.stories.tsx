import type { Meta, StoryObj } from '@storybook/react-vite';
import { ErrorScreen } from './ErrorScreen';

const meta = {
  title: 'Components/ErrorScreen',
  component: ErrorScreen,
  tags: ['autodocs'],
} satisfies Meta<typeof ErrorScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Ups! Algo ha ido mal',
    message: 'No se ha podido cargar este baúl. Comprueba tu conexión e inténtalo de nuevo.',
    actionLabel: 'Reintentar',
    onAction: () => {},
  },
};

export const InvitationNotFound: Story = {
  args: {
    title: 'Invitación no encontrada',
    message: 'Este enlace de invitación no es válido o ya ha sido usado.',
    actionLabel: 'Ir a mis baúles',
    onAction: () => {},
  },
};
