// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { ChatMessage } from '@/types';
import { AiChatScreen } from './AiChatScreen';

// jsdom doesn't implement scrollIntoView — AiChatScreen calls it on every message-count
// change to keep the conversation scrolled to the bottom.
Element.prototype.scrollIntoView = vi.fn();

function message(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'm1',
    role: 'user',
    content: 'Hola',
    createdAt: new Date().toISOString(),
    ...overrides,
  } as ChatMessage;
}

function renderScreen(overrides: Partial<ComponentProps<typeof AiChatScreen>> = {}) {
  return render(
    <AiChatScreen
      messages={[]}
      isLoadingHistory={false}
      isSending={false}
      hasError={false}
      suggestions={[]}
      isLoadingSuggestions={false}
      onBack={vi.fn()}
      onSend={vi.fn()}
      {...overrides}
    />
  );
}

describe('AiChatScreen', () => {
  it('renders the conversation history', () => {
    renderScreen({
      messages: [
        message({ id: 'm1', role: 'user', content: '¿Cuándo nació la abuela?' }),
        message({ id: 'm2', role: 'assistant', content: 'En 1945.' }),
      ],
    });

    expect(screen.getByText('¿Cuándo nació la abuela?')).toBeInTheDocument();
    expect(screen.getByText('En 1945.')).toBeInTheDocument();
  });

  it('shows the starter prompt and suggestions when there is no history yet', () => {
    renderScreen({ suggestions: ['¿Quién es esta persona?', '¿Dónde se tomó esta foto?'] });

    expect(screen.getByText(/Pregúntame lo que quieras/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '¿Quién es esta persona?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '¿Dónde se tomó esta foto?' })).toBeInTheDocument();
  });

  it('does not show the starter prompt once there is history, even with suggestions loaded', () => {
    renderScreen({
      messages: [message()],
      suggestions: ['¿Quién es esta persona?'],
    });

    expect(screen.queryByText(/Pregúntame lo que quieras/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '¿Quién es esta persona?' })).not.toBeInTheDocument();
  });

  it('shows a loading hint while suggestions are being fetched, instead of the list', () => {
    renderScreen({ isLoadingSuggestions: true, suggestions: [] });

    expect(screen.getByText('Pensando en preguntas...')).toBeInTheDocument();
  });

  it('sends a suggestion when clicked', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    renderScreen({ suggestions: ['¿Quién es esta persona?'], onSend });

    await user.click(screen.getByRole('button', { name: '¿Quién es esta persona?' }));

    expect(onSend).toHaveBeenCalledWith('¿Quién es esta persona?');
  });

  it('sends the typed message and clears the input', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    renderScreen({ onSend });

    const input = screen.getByRole('textbox');
    await user.type(input, 'Cuéntame más{Enter}');

    expect(onSend).toHaveBeenCalledWith('Cuéntame más');
    expect(input).toHaveValue('');
  });

  it('sends the typed message via the send button, trimmed', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    renderScreen({ onSend });

    await user.type(screen.getByRole('textbox'), '  Cuéntame más  ');
    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(onSend).toHaveBeenCalledWith('Cuéntame más');
  });

  it('does not send an empty or whitespace-only message', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    renderScreen({ onSend });

    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();

    await user.type(screen.getByRole('textbox'), '   ');
    await user.keyboard('{Enter}');

    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
    expect(onSend).not.toHaveBeenCalled();
  });

  it('disables input and shows a typing indicator while sending', () => {
    renderScreen({ isSending: true, messages: [message()] });

    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
    expect(screen.getByText('Escribiendo...')).toBeInTheDocument();
  });

  it('shows an error message when the last exchange failed', () => {
    renderScreen({ hasError: true });

    expect(screen.getByText(/No hemos podido obtener una respuesta/i)).toBeInTheDocument();
  });

  it('goes back when the back button is clicked', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderScreen({ onBack });

    await user.click(screen.getByRole('button', { name: 'Volver' }));

    expect(onBack).toHaveBeenCalled();
  });
});
