import type { Meta, StoryObj } from '@storybook/react-vite';
import { RecuerdoInput } from '@/features/memories/components/RecuerdoInput';

const meta = {
  title: 'Features/Memories/RecuerdoInput',
  component: RecuerdoInput,
  tags: ['autodocs'],
  decorators: [(Story) => <div className="bg-foreground p-8"><Story /></div>],
  parameters: {
    docs: {
      description: {
        component: `
### Purpose
Inline memory composer used inside the photo viewer.

### When to use
Use when the user is looking at a photo and can add a short memory without leaving the viewer. It composes the \`Input\` \`photoViewerMemory\` variant plus an icon-only send button.

### When NOT to use
Do not use for long-form editing, modal forms or feed-level memory creation; those flows need larger text areas and explicit save/cancel actions.

### Typical examples
Adding "qué recuerdas de este momento" while browsing a single photo.

### Common mistakes
Recreating the dark textarea ad hoc, showing a persistent send button before there is text, or submitting on Enter while the text area is empty.
`,
      },
    },
  },
} satisfies Meta<typeof RecuerdoInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    photoId: 'photo-1',
    onSubmit: (text) => alert(`onSubmit clicked: ${text}`),
  },
};
