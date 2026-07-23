import type { Meta, StoryObj } from '@storybook/react-vite';
import { MiSuscripcionScreen } from './MiSuscripcionScreen';

const meta = {
  title: 'Components/MiSuscripcionScreen',
  component: MiSuscripcionScreen,
  tags: ['autodocs'],
} satisfies Meta<typeof MiSuscripcionScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Gratuito: Story = {
  args: {
    onBack: () => alert('onBack clicked'),
    onChangePlan: () => alert('onChangePlan clicked'),
    subscription: {
      currentPlan: 'gratuito',
      baulesUsed: 1,
      baulesLimit: 1,
      storagePerBaulGB: 5,
    },
  },
};

export const Premium: Story = {
  args: {
    onBack: () => alert('onBack clicked'),
    onChangePlan: () => alert('onChangePlan clicked'),
    subscription: {
      currentPlan: 'premium',
      baulesUsed: 2,
      baulesLimit: 5,
      storagePerBaulGB: 50,
    },
  },
};
