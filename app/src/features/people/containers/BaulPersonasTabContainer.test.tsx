// @vitest-environment jsdom
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Persona } from '@/types';
import { usePersonasStore } from '@/store/usePersonasStore';
import { useAuthStore } from '@/store/useAuthStore';
import { BaulPersonasTabContainer } from './BaulPersonasTabContainer';

vi.mock('@/features/people/useCases', () => ({
  createPersona: vi.fn(),
  loadPersonaRelationships: vi.fn().mockResolvedValue(undefined),
}));

import { createPersona, loadPersonaRelationships } from '@/features/people/useCases';

const baulId = 'baul-1';

function persona(overrides: Partial<Persona> = {}): Persona {
  return {
    id: 'p1', baulId, nickname: 'Abuela Rosa', status: 'active', role: 'colaborador',
    invitedDate: 'hace 1 año', ...overrides,
  } as Persona;
}

function PersonaDetailStub() {
  const location = useLocation();
  const state = location.state as { source?: string } | null;
  return <div>Ficha de persona{state?.source ? ` (source: ${state.source})` : ''}</div>;
}

function renderContainer(canCreatePersona = true) {
  return render(
    <MemoryRouter initialEntries={[`/baules/${baulId}`]}>
      <Routes>
        <Route path="/baules/:baulId" element={<BaulPersonasTabContainer baulId={baulId} canCreatePersona={canCreatePersona} />} />
        <Route path="/baules/:baulId/personas/:personaId" element={<PersonaDetailStub />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('BaulPersonasTabContainer', () => {
  beforeEach(() => {
    usePersonasStore.setState({ personas: {}, removalRequests: {}, personaPhotos: {}, taggedPersonas: {}, relationships: {} });
    useAuthStore.setState({ userProfile: { photoUrl: '', name: '', email: 'me@example.com' } });
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(loadPersonaRelationships).mockResolvedValue(undefined);
  });

  it('loads the baúl relationships once on mount', () => {
    usePersonasStore.setState({ personas: { [baulId]: [persona()] } });

    renderContainer();

    expect(loadPersonaRelationships).toHaveBeenCalledWith(baulId);
  });

  it('does not reload relationships already cached for this baúl', () => {
    usePersonasStore.setState({ personas: { [baulId]: [persona()] }, relationships: { [baulId]: [] } });

    renderContainer();

    expect(loadPersonaRelationships).not.toHaveBeenCalled();
  });

  it('switches to the family tree view, persists the choice and tracks family_view_changed', async () => {
    const user = userEvent.setup();
    usePersonasStore.setState({ personas: { [baulId]: [persona()] } });

    renderContainer();
    await user.click(screen.getByRole('button', { name: 'Árbol genealógico' }));

    expect(localStorage.getItem('elbaul.familiaView')).toBe('arbol');
  });

  it('opens straight into the family tree view on a later visit once the choice was persisted', () => {
    localStorage.setItem('elbaul.familiaView', 'arbol');
    usePersonasStore.setState({ personas: { [baulId]: [] } });

    renderContainer();

    expect(screen.getByRole('button', { name: 'Árbol genealógico' })).toHaveAttribute('aria-pressed', 'true');
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

  it('tags navigation with source: family_tree when the persona is opened from the tree view', async () => {
    const user = userEvent.setup();
    const padre = persona({ id: 'padre', nickname: 'Antonio' });
    const hija = persona({ id: 'hija', nickname: 'Laura' });
    usePersonasStore.setState({
      personas: { [baulId]: [padre, hija] },
      relationships: { [baulId]: [{ parentId: 'padre', childId: 'hija' }] as never },
    });

    renderContainer();
    await user.click(screen.getByRole('button', { name: 'Árbol genealógico' }));
    await user.click(screen.getByText('Laura'));

    expect(screen.getByText('Ficha de persona (source: family_tree)')).toBeInTheDocument();
  });

  it('creates a persona and closes the modal on success', async () => {
    const user = userEvent.setup();
    vi.mocked(createPersona).mockResolvedValue(persona({ id: 'p-new', nickname: 'Tío Juan' }));

    renderContainer();
    await user.click(screen.getByRole('button', { name: /nueva persona/i }));
    await user.type(screen.getByPlaceholderText('Ej. Abuela, Tío Juan…'), 'Tío Juan');
    await user.click(screen.getByRole('button', { name: /añadir/i }));

    expect(createPersona).toHaveBeenCalledWith(baulId, 'Tío Juan', 'colaborador');
    await waitFor(() => expect(screen.queryByPlaceholderText('Ej. Abuela, Tío Juan…')).not.toBeInTheDocument());
  });

  it('hides the "Nueva persona" FAB when the caller can\'t create personas', () => {
    renderContainer(false);

    expect(screen.queryByRole('button', { name: /nueva persona/i })).not.toBeInTheDocument();
  });
});
