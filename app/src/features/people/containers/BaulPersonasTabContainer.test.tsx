// @vitest-environment jsdom
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Persona } from '@/types';
import { usePersonasStore } from '@/store/usePersonasStore';
import { useAuthStore } from '@/store/useAuthStore';
import { BaulPersonasTabContainer } from './BaulPersonasTabContainer';

vi.mock('@/features/people/useCases', () => ({
  createPersona: vi.fn(),
}));

import { createPersona } from '@/features/people/useCases';

const baulId = 'baul-1';

function persona(overrides: Partial<Persona> = {}): Persona {
  return {
    id: 'p1', baulId, nickname: 'Abuela Rosa', status: 'active', role: 'colaborador',
    invitedDate: 'hace 1 año', ...overrides,
  } as Persona;
}

function renderContainer(canCreatePersona = true) {
  return render(
    <MemoryRouter initialEntries={[`/baules/${baulId}`]}>
      <Routes>
        <Route path="/baules/:baulId" element={<BaulPersonasTabContainer baulId={baulId} canCreatePersona={canCreatePersona} />} />
        <Route path="/baules/:baulId/personas/:personaId" element={<div>Ficha de persona</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('BaulPersonasTabContainer', () => {
  beforeEach(() => {
    usePersonasStore.setState({ personas: {}, removalRequests: {}, personaPhotos: {}, taggedPersonas: {} });
    useAuthStore.setState({ userProfile: { photoUrl: '', name: '', email: 'me@example.com' } });
    vi.clearAllMocks();
  });

  it('renders the personas cached for this baúl', () => {
    usePersonasStore.setState({ personas: { [baulId]: [persona()] } });

    renderContainer();

    expect(screen.getByText('Abuela Rosa')).toBeInTheDocument();
  });

  it('navigates to the persona detail screen on select', async () => {
    const user = userEvent.setup();
    usePersonasStore.setState({ personas: { [baulId]: [persona()] } });

    renderContainer();
    await user.click(screen.getByText('Abuela Rosa'));

    expect(screen.getByText('Ficha de persona')).toBeInTheDocument();
  });

  it('creates a persona and closes the modal on success', async () => {
    const user = userEvent.setup();
    vi.mocked(createPersona).mockResolvedValue(persona({ id: 'p-new', nickname: 'Tío Juan' }));

    renderContainer();
    await user.click(screen.getByRole('button', { name: /nueva persona/i }));
    await user.type(screen.getByPlaceholderText('Ej. Abuela, Tío Juan…'), 'Tío Juan');
    await user.click(screen.getByRole('button', { name: /añadir/i }));

    expect(createPersona).toHaveBeenCalledWith(baulId, 'Tío Juan');
    await waitFor(() => expect(screen.queryByPlaceholderText('Ej. Abuela, Tío Juan…')).not.toBeInTheDocument());
  });

  it('hides the "Nueva persona" FAB when the caller can\'t create personas', () => {
    renderContainer(false);

    expect(screen.queryByRole('button', { name: /nueva persona/i })).not.toBeInTheDocument();
  });
});
