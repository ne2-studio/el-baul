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
    onBack: () => {},
    onSubmit: async () => {},
  },
};

export const Suggestion: Story = {
  args: {
    title: 'Enviar una sugerencia',
    onBack: () => {},
    onSubmit: async () => {},
  },
};

export const Failing: Story = {
  args: {
    title: 'Hablar con soporte',
    onBack: () => {},
    onSubmit: async () => {
      throw new Error('Request failed');
    },
  },
};
