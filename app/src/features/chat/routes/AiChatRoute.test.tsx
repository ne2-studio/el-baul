// @vitest-environment jsdom
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatMessage } from '@/types';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { AiChatRoute } from './AiChatRoute';

vi.mock('@/api', () => ({
  api: {
    chat: {
      getMessages: vi.fn(),
      sendMessage: vi.fn(),
      getSuggestedQuestions: vi.fn(),
    },
  },
}));

import { api } from '@/api';

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
    vi.clearAllMocks();
    vi.mocked(api.chat.getMessages).mockResolvedValue([]);
    vi.mocked(api.chat.getSuggestedQuestions).mockResolvedValue([]);
  });

  it('loads and renders the existing conversation for this baúl', async () => {
    vi.mocked(api.chat.getMessages).mockResolvedValue([
      message({ id: 'm1', role: 'user', content: '¿Cuándo nació la abuela?' }),
      message({ id: 'm2', role: 'assistant', content: 'En 1945.' }),
    ]);

    renderRoute();

    expect(await screen.findByText('¿Cuándo nació la abuela?')).toBeInTheDocument();
    expect(screen.getByText('En 1945.')).toBeInTheDocument();
    expect(api.chat.getMessages).toHaveBeenCalledWith(baulId);
  });

  it('fetches starter suggestions when the history is empty and the feature is enabled', async () => {
    useAppConfigStore.setState({ chatSuggestionsEnabled: true });
    vi.mocked(api.chat.getSuggestedQuestions).mockResolvedValue(['¿Quién es esta persona?']);

    renderRoute();

    expect(await screen.findByRole('button', { name: '¿Quién es esta persona?' })).toBeInTheDocument();
    expect(api.chat.getSuggestedQuestions).toHaveBeenCalledWith(baulId);
  });

  it('does not fetch suggestions when the feature is disabled', async () => {
    useAppConfigStore.setState({ chatSuggestionsEnabled: false });

    renderRoute();
    await waitFor(() => expect(api.chat.getMessages).toHaveBeenCalled());

    expect(api.chat.getSuggestedQuestions).not.toHaveBeenCalled();
  });

  it('does not fetch suggestions when there is already history, even with the feature enabled', async () => {
    useAppConfigStore.setState({ chatSuggestionsEnabled: true });
    vi.mocked(api.chat.getMessages).mockResolvedValue([message()]);

    renderRoute();
    await waitFor(() => expect(api.chat.getMessages).toHaveBeenCalled());

    expect(api.chat.getSuggestedQuestions).not.toHaveBeenCalled();
  });

  it('shows an error state when the history fails to load', async () => {
    vi.mocked(api.chat.getMessages).mockRejectedValue(new Error('network'));

    renderRoute();

    expect(await screen.findByText(/No hemos podido obtener una respuesta/i)).toBeInTheDocument();
  });

  it('sends a message and appends both the outgoing text and the reply', async () => {
    const user = userEvent.setup();
    vi.mocked(api.chat.sendMessage).mockResolvedValue(
      message({ id: 'reply-1', role: 'assistant', content: 'En 1945.' })
    );

    renderRoute();
    await waitFor(() => expect(api.chat.getMessages).toHaveBeenCalled());

    await user.type(screen.getByRole('textbox'), '¿Cuándo nació la abuela?{Enter}');

    expect(await screen.findByText('¿Cuándo nació la abuela?')).toBeInTheDocument();
    expect(await screen.findByText('En 1945.')).toBeInTheDocument();
    expect(api.chat.sendMessage).toHaveBeenCalledWith(baulId, '¿Cuándo nació la abuela?');
  });

  it('shows an error and keeps the outgoing message when sending fails', async () => {
    const user = userEvent.setup();
    vi.mocked(api.chat.sendMessage).mockRejectedValue(new Error('network'));

    renderRoute();
    await waitFor(() => expect(api.chat.getMessages).toHaveBeenCalled());

    await user.type(screen.getByRole('textbox'), '¿Cuándo nació la abuela?{Enter}');

    expect(await screen.findByText('¿Cuándo nació la abuela?')).toBeInTheDocument();
    expect(await screen.findByText(/No hemos podido obtener una respuesta/i)).toBeInTheDocument();
  });

  it('navigates back when the back button is clicked', async () => {
    const user = userEvent.setup();
    renderRoute([`/baules/${baulId}`, `/baules/${baulId}/recordar`]);
    await waitFor(() => expect(api.chat.getMessages).toHaveBeenCalled());

    await user.click(screen.getByRole('button', { name: 'Volver' }));

    expect(await screen.findByText('Ficha del baúl')).toBeInTheDocument();
  });
});
