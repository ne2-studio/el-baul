import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';

const meta = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'danger'],
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    children: 'Crear baúl',
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Cancelar',
    variant: 'secondary',
  },
};

export const Ghost: Story = {
  args: {
    children: 'Omitir',
    variant: 'ghost',
  },
};

export const Danger: Story = {
  args: {
    children: 'Quitar acceso',
    variant: 'danger',
  },
};

export const Loading: Story = {
  args: {
    children: 'Subiendo...',
    variant: 'primary',
    isLoading: true,
  },
};

export const Disabled: Story = {
  args: {
    children: 'No disponible',
    variant: 'primary',
    disabled: true,
  },
};

export const FullWidth: Story = {
  args: {
    children: 'Continuar',
    variant: 'primary',
    fullWidth: true,
  },
};
