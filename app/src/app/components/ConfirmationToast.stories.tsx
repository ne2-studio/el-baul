import type { Meta, StoryObj } from '@storybook/react-vite';
import { ConfirmationToast } from './ConfirmationToast';

const meta = {
  title: 'Components/ConfirmationToast',
  component: ConfirmationToast,
  tags: ['autodocs'],
} satisfies Meta<typeof ConfirmationToast>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    message: 'Tu solicitud ha sido enviada al custodio del baúl.',
  },
};
