import type { Meta, StoryObj } from '@storybook/react-vite';
import { PlanLimitModal } from './PlanLimitModal';

const meta = {
  title: 'Components/PlanLimitModal',
  component: PlanLimitModal,
  tags: ['autodocs'],
} satisfies Meta<typeof PlanLimitModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onClose: () => {},
    onUpgradePlan: () => {},
    baulesUsed: 1,
    baulesLimit: 1,
  },
};

export const HigherPlanLimit: Story = {
  args: {
    onClose: () => {},
    onUpgradePlan: () => {},
    baulesUsed: 5,
    baulesLimit: 5,
  },
};
