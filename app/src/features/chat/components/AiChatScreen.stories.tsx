import type { Meta, StoryObj } from '@storybook/react-vite';
import { AiChatScreen } from '@/features/chat/components/AiChatScreen';
import { ChatMessage } from '@/types';

const meta = {
  title: 'Features/Chat/AiChatScreen',
  component: AiChatScreen,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof AiChatScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

const messages: ChatMessage[] = [
  { id: '1', role: 'user', content: '¿Cuándo fue la última vez que fuimos a la playa?', createdAt: '2024-07-15T10:00:00Z' } as ChatMessage,
  { id: '2', role: 'assistant', content: 'Según tus recuerdos, la última vez que fuisteis a la playa fue en julio de 2024, durante el capítulo "Verano 2024".', createdAt: '2024-07-15T10:00:05Z' } as ChatMessage,
];

const sharedDefaults = {
  isLoadingHistory: false,
  isSending: false,
  hasError: false,
  suggestions: ['¿Cuántas fotos tengo de Navidad?', '¿Quién aparece más en mis recuerdos?'],
  isLoadingSuggestions: false,
  onBack: () => alert('onBack clicked'),
  onSend: (text: string) => alert(`onSend: ${text}`),
};

export const WithHistory: Story = {
  args: {
    ...sharedDefaults,
    messages,
  },
};

export const EmptyWithSuggestions: Story = {
  args: {
    ...sharedDefaults,
    messages: [],
  },
};

export const Sending: Story = {
  args: {
    ...sharedDefaults,
    messages,
    isSending: true,
  },
};

export const WithError: Story = {
  args: {
    ...sharedDefaults,
    messages,
    hasError: true,
  },
};

export const LoadingHistory: Story = {
  args: {
    ...sharedDefaults,
    messages: [],
    isLoadingHistory: true,
  },
};
