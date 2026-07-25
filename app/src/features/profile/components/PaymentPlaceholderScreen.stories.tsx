import type { Meta, StoryObj } from '@storybook/react-vite';
import { PaymentPlaceholderScreen } from '@/features/profile/components/PaymentPlaceholderScreen';

const meta = {
  title: 'Screens/Subscription/PaymentPlaceholder',
  component: PaymentPlaceholderScreen,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof PaymentPlaceholderScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Premium: Story = {
  args: {
    onBack: () => alert('onBack clicked'),
    selectedPlan: 'premium',
    onComplete: () => alert('onComplete clicked'),
  },
};

export const Gratuito: Story = {
  args: {
    ...Premium.args,
    selectedPlan: 'gratuito',
  },
};
