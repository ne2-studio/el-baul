// @vitest-environment jsdom
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatMessage } from '@/types';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { useChatStore } from '@/store/useChatStore';
import { AiChatRoute } from './AiChatRoute';

vi.mock('@/features/chat/useCases', () => ({
  loadChatConversation: vi.fn(),
  sendChatMessage: vi.fn(),
}));

import { loadChatConversation, sendChatMessage } from '@/features/chat/useCases';

// jsdom doesn't implement scrollIntoView — AiChatScreen (rendered by this route) calls it
// on every message-count change to keep the conversation scrolled to the bottom.
Element.prototype.scrollIntoView = vi.fn();

const baulId = 'baul-1';

function message(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'm1',
    role: 'user',
    content: 'Hola',
    createdAt: new Date().toISOString(),
    ...overrides,
  } as ChatMessage;
}

function renderRoute(initialEntries: string[] = [`/baules/${baulId}/recordar`]) {
  return render(
    <MemoryRouter initialEntries={initialEntries} initialIndex={initialEntries.length - 1}>
      <Routes>
        <Route path="/baules/:baulId" element={<div>Ficha del baúl</div>} />
        <Route path="/baules/:baulId/recordar" element={<AiChatRoute />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('AiChatRoute', () => {
  beforeEach(() => {
    useAppConfigStore.setState({ chatSuggestionsEnabled: false });
    useChatStore.getState().reset();
    vi.clearAllMocks();
  });

  it('loads the conversation for this baúl through the chat use case', async () => {
    renderRoute();

    await waitFor(() => expect(loadChatConversation).toHaveBeenCalledWith(baulId, {
      suggestionsEnabled: false,
    }));
  });

  it('passes the starter-suggestions feature flag into the chat use case', async () => {
    useAppConfigStore.setState({ chatSuggestionsEnabled: true });

    renderRoute();

    await waitFor(() => expect(loadChatConversation).toHaveBeenCalledWith(baulId, {
      suggestionsEnabled: true,
    }));
  });

  it('renders chat state owned by the feature boundary', () => {
    useChatStore.setState({
      activeBaulId: baulId,
      messages: [
        message({ id: 'm1', role: 'user', content: '¿Cuándo nació la abuela?' }),
        message({ id: 'm2', role: 'assistant', content: 'En 1945.' }),
      ],
    });

    renderRoute();

    expect(screen.getByText('¿Cuándo nació la abuela?')).toBeInTheDocument();
    expect(screen.getByText('En 1945.')).toBeInTheDocument();
  });

  it('sends messages through the chat use case with the current baúl id', async () => {
    const user = userEvent.setup();

    renderRoute();

    await user.type(screen.getByRole('textbox'), '¿Cuándo nació la abuela?{Enter}');

    expect(sendChatMessage).toHaveBeenCalledWith(baulId, '¿Cuándo nació la abuela?');
  });

  it('navigates back when the back button is clicked', async () => {
    const user = userEvent.setup();
    renderRoute([`/baules/${baulId}`, `/baules/${baulId}/recordar`]);

    await user.click(screen.getByRole('button', { name: 'Volver' }));

    expect(await screen.findByText('Ficha del baúl')).toBeInTheDocument();
  });
});
