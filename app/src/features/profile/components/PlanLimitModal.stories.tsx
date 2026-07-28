import type { Meta, StoryObj } from '@storybook/react-vite';
import { PlanLimitModal } from '@/features/profile/components/PlanLimitModal';
import { viewportGlobals } from '@/storybook/viewports';

const meta = {
  title: 'Features/Subscription/PlanLimitModal',
  component: PlanLimitModal,
  tags: ['autodocs'],
} satisfies Meta<typeof PlanLimitModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onClose: () => alert('onClose clicked'),
    onUpgradePlan: () => alert('onUpgradePlan clicked'),
    baulesUsed: 1,
    baulesLimit: 1,
  },
};

export const HigherPlanLimit: Story = {
  args: {
    onClose: () => alert('onClose clicked'),
    onUpgradePlan: () => alert('onUpgradePlan clicked'),
    baulesUsed: 5,
    baulesLimit: 5,
  },
};

export const PlanLimitBottomSheetMobile: Story = {
  args: {
    ...Default.args,
  },
  globals: viewportGlobals.mobile,
};

export const PlanLimitCenteredDesktop: Story = {
  args: {
    ...Default.args,
  },
  globals: viewportGlobals.desktop,
};
