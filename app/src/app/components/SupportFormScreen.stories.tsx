import type { Meta, StoryObj } from '@storybook/react-vite';
import { SupportFormScreen } from './SupportFormScreen';

const meta = {
  title: 'Components/SupportFormScreen',
  component: SupportFormScreen,
  tags: ['autodocs'],
} satisfies Meta<typeof SupportFormScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ReportBug: Story = {
  args: {
    title: 'Informar de un problema',
    onBack: () => alert('onBack clicked'),
    onSubmit: async () => alert('onSubmit clicked'),
  },
};

export const Suggestion: Story = {
  args: {
    title: 'Enviar una sugerencia',
    onBack: () => alert('onBack clicked'),
    onSubmit: async () => alert('onSubmit clicked'),
  },
};

export const Failing: Story = {
  args: {
    title: 'Hablar con soporte',
    onBack: () => alert('onBack clicked'),
    onSubmit: async () => {
      throw new Error('Request failed');
    },
  },
};
