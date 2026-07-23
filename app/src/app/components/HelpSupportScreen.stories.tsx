import type { Meta, StoryObj } from '@storybook/react-vite';
import { HelpSupportScreen } from './HelpSupportScreen';

const meta = {
  title: 'Components/HelpSupportScreen',
  component: HelpSupportScreen,
  tags: ['autodocs'],
} satisfies Meta<typeof HelpSupportScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onBack: () => alert('onBack clicked'),
    onOpenHelpCenter: () => alert('onOpenHelpCenter clicked'),
    onReportBug: () => alert('onReportBug clicked'),
    onSendSuggestion: () => alert('onSendSuggestion clicked'),
    onContactSupport: () => alert('onContactSupport clicked'),
  },
};
