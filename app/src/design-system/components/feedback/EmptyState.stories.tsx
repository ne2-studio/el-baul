import type { Meta, StoryObj } from '@storybook/react-vite';
import { ImageIcon } from 'lucide-react';
import { EmptyState } from '@/design-system/components/feedback/EmptyState';

const meta = {
  title: 'Components/Feedback/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Purpose
Centered, calm feedback for a valid screen or section that has no content yet.

### When to use
Use when an album, tab, selector or list is empty and the user needs context for what would normally appear there. Keep copy specific to the product state.

### When NOT to use
Do not use for loading, errors, permission failures or destructive confirmations. Do not use as a decorative hero or marketing block.

### Typical examples
No photos in a baul, no memories for a photo, no baules available for sharing, or no photos to choose as a cover.

### Common mistakes
Using generic text such as "No items", omitting the next useful action nearby, or adding a strong icon when the state should remain quiet.

### Related components
\`Button\` or \`FAB\` usually provides the next action; \`ErrorScreen\` handles failures; feature screens compose \`EmptyState\` inside \`PageContainer\`.
`,
      },
    },
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Sin fotos todavía',
    subtitle: 'Sube tus primeros recuerdos para empezar a llenar este baúl.',
  },
};

export const WithIcon: Story = {
  args: {
    title: 'Sin fotos todavía',
    subtitle: 'Sube tus primeros recuerdos para empezar a llenar este baúl.',
    icon: <ImageIcon className="w-12 h-12" />,
  },
};
