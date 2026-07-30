import type { Meta, StoryObj } from '@storybook/react-vite';
import { BlockingLoadingOverlay } from '@/design-system/components/feedback/BlockingLoadingOverlay';

const meta = {
  title: 'Components/Feedback/BlockingLoadingOverlay',
  component: BlockingLoadingOverlay,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Purpose
Full-screen blocking feedback for short transitions where the current screen must not remain interactive.

### When to use
Use it while opening a baúl, prefetching data before navigation, or running a blocking operation whose result changes the current route or screen context.

### When NOT to use
Do not use it for initial app/domain loading; use a screen-level loading component such as \`BaulesLoadingScreen\`. Do not use it inside cards, lists, modals, or paginated sections; use \`LoadingSpinner\` there.

### Copy
Keep the message action-oriented and specific: "Abriendo baúl...", "Cargando fotos..." or "Actualizando fecha...".
`,
      },
    },
  },
} satisfies Meta<typeof BlockingLoadingOverlay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    message: 'Cargando baúl...',
  },
};

export const LongMessage: Story = {
  args: {
    message: 'Actualizando fecha de 12 fotos...',
  },
};
