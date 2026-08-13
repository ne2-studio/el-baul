// @vitest-environment jsdom
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatMemory } from '@/types';
import { useChatMemoriesStore } from '@/store/useChatMemoriesStore';
import { ChatMemoriesRoute } from './ChatMemoriesRoute';

vi.mock('@/features/chat/useCases', () => ({
  loadChatMemories: vi.fn(),
  updateChatMemory: vi.fn(),
  deleteChatMemory: vi.fn(),
}));

import { deleteChatMemory, loadChatMemories, updateChatMemory } from '@/features/chat/useCases';

const baulId = 'baul-1';

const memoryTimestamp = new Date().toISOString();

function memory(overrides: Partial<ChatMemory> = {}): ChatMemory {
  return new ChatMemory({
    id: 'mem-1',
    content: 'El abuelo Manuel trabajó en Muebles López.',
    createdAt: memoryTimestamp,
    updatedAt: memoryTimestamp,
    ...overrides,
  });
}

function renderRoute(initialEntries: string[] = [`/baules/${baulId}/recordar/memoria`]) {
  return render(
    <MemoryRouter initialEntries={initialEntries} initialIndex={initialEntries.length - 1}>
      <Routes>
        <Route path="/baules/:baulId/recordar" element={<div>Chat</div>} />
        <Route path="/baules/:baulId/recordar/memoria" element={<ChatMemoriesRoute />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ChatMemoriesRoute', () => {
  beforeEach(() => {
    useChatMemoriesStore.getState().reset();
    vi.clearAllMocks();
  });

  it('loads memories for this baúl through the use case', async () => {
    renderRoute();

    await waitFor(() => expect(loadChatMemories).toHaveBeenCalledWith(baulId));
  });

  it('renders the memories owned by the feature boundary', () => {
    useChatMemoriesStore.setState({ baulId, memories: [memory()] });

    renderRoute();

    expect(screen.getByText('El abuelo Manuel trabajó en Muebles López.')).toBeInTheDocument();
  });

  it('edits a memory through the use case with the current baúl id', async () => {
    useChatMemoriesStore.setState({ baulId, memories: [memory()] });
    vi.mocked(updateChatMemory).mockResolvedValue(true);
    const user = userEvent.setup();

    renderRoute();
    await user.click(screen.getByRole('button', { name: /editar/i }));
    const textbox = await screen.findByDisplayValue('El abuelo Manuel trabajó en Muebles López.');
    await user.clear(textbox);
    await user.type(textbox, 'El abuelo Manuel trabajó 30 años en Muebles López.');
    await user.click(screen.getByRole('button', { name: /^guardar$/i }));

    expect(updateChatMemory).toHaveBeenCalledWith(baulId, 'mem-1', 'El abuelo Manuel trabajó 30 años en Muebles López.');
  });

  it('deletes a memory through the use case with the current baúl id', async () => {
    useChatMemoriesStore.setState({ baulId, memories: [memory()] });
    vi.mocked(deleteChatMemory).mockResolvedValue(true);
    const user = userEvent.setup();

    renderRoute();
    await user.click(screen.getByRole('button', { name: /eliminar/i }));
    await user.click(screen.getByRole('button', { name: /sí, eliminar/i }));

    expect(deleteChatMemory).toHaveBeenCalledWith(baulId, 'mem-1');
  });

  it('navigates back when the back button is clicked', async () => {
    renderRoute([`/baules/${baulId}/recordar`, `/baules/${baulId}/recordar/memoria`]);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Volver' }));

    expect(await screen.findByText('Chat')).toBeInTheDocument();
  });
});
