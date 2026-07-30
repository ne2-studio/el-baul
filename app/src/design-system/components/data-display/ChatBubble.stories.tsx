import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChatBubble } from '@/design-system/components/data-display/ChatBubble';

const meta = {
  title: 'Components/Data Display/ChatBubble',
  component: ChatBubble,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Purpose
Message bubble primitive for conversational UI.

### When to use
Use for user and assistant messages in chat-like surfaces where message ownership changes alignment and color.

### When NOT to use
Do not use for toasts, cards, comments outside a conversation, or rich assistant answers that need structured blocks.

### Typical examples
The "Ayúdame a recordar" chat thread and future contextual AI conversations.

### Common mistakes
Hard-coding bubble classes in the screen, using the user style for system messages, or placing controls inside the text bubble before the component supports them.
`,
      },
    },
  },
} satisfies Meta<typeof ChatBubble>;

export default meta;
type Story = StoryObj<typeof meta>;

export const User: Story = {
  args: {
    role: 'user',
    children: '¿Quién aparece más en las fotos de Navidad?',
  },
};

export const Assistant: Story = {
  args: {
    role: 'assistant',
    children: 'Parece que Papá y la abuela Rosa aparecen en la mayoría de recuerdos de ese capítulo.',
  },
};

export const Thread: Story = {
  args: {
    role: 'assistant',
    children: '',
  },
  render: () => (
    <div className="flex max-w-xl flex-col gap-3">
      <ChatBubble role="user">¿Cuándo fue la última vez que fuimos a la playa?</ChatBubble>
      <ChatBubble role="assistant">Según tus recuerdos, fue en julio de 2024, durante el capítulo "Verano 2024".</ChatBubble>
    </div>
  ),
};
