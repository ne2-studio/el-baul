import type { Meta, StoryObj } from '@storybook/react-vite';
import { PlanSelectionScreen } from '@/features/profile/components/PlanSelectionScreen';

const meta = {
  title: 'Screens/Subscription/PlanSelection',
  component: PlanSelectionScreen,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof PlanSelectionScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Gratuito: Story = {
  args: {
    onBack: () => alert('onBack clicked'),
    currentPlan: 'gratuito',
    onUpdatePlan: (plan) => alert(`onUpdatePlan: ${plan}`),
  },
};

export const Familiar: Story = {
  args: {
    ...Gratuito.args,
    currentPlan: 'familiar',
  },
};

export const Premium: Story = {
  args: {
    ...Gratuito.args,
    currentPlan: 'premium',
  },
};
