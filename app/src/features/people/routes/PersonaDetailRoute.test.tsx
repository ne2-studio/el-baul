// @vitest-environment jsdom
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Persona } from '@/types';
import { usePersonasStore } from '@/store/usePersonasStore';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { PersonaDetailRoute } from './PersonaDetailRoute';

vi.mock('react-oidc-context', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

vi.mock('@/api', () => ({
  api: { baules: { getPersonaScope: vi.fn() } },
}));

vi.mock('@/features/people/containers/PersonaSettingsMenuContainer', () => ({
  PersonaSettingsMenuContainer: () => <div>Ajustes de la persona</div>,
}));

vi.mock('@/features/people/containers/PersonaFotosTabContainer', () => ({
  PersonaFotosTabContainer: () => <div>Contenido · Fotos</div>,
}));

vi.mock('@/features/people/containers/PersonaRecuerdosTabContainer', () => ({
  PersonaRecuerdosTabContainer: () => <div>Contenido · Recuerdos</div>,
}));

vi.mock('@/features/people/containers/PersonaBiografiaTabContainer', () => ({
  PersonaBiografiaTabContainer: () => <div>Contenido · Biografía</div>,
}));

// jsdom no implementa ResizeObserver (usado por useElementHeight, vía PageHeader) ni un
// scroll real (Tabbar llama a window.scrollTo al cambiar de pestaña) — sin esto no rompen el
// test, pero sí ensucian la salida con warnings/errores no relacionados con lo que se prueba.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub);
vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

const baulId = 'baul-1';
const personaId = 'persona-1';

function persona(overrides: Partial<Persona> = {}): Persona {
  return {
    id: personaId, baulId, nickname: 'Abuela', status: 'active', role: 'colaborador',
    isCustodio: false, invitedDate: 'hace 1 día', ...overrides,
  } as Persona;
}

function renderRoute() {
  return render(
    <MemoryRouter initialEntries={[`/baules/${baulId}/personas/${personaId}`]}>
      <Routes>
        <Route path="/baules/:baulId/personas/:personaId" element={<PersonaDetailRoute />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('PersonaDetailRoute biografía tab visibility', () => {
  beforeEach(() => {
    usePersonasStore.setState({ personas: { [baulId]: [persona()] }, personaPhotos: { [personaId]: [] } });
    useRecuerdosStore.setState({ baulRecuerdos: { [baulId]: [] } });
    useAppConfigStore.setState({ biografiaEnabled: false });
    vi.clearAllMocks();
  });

  it('hides the Biografía tab when the feature toggle is off', () => {
    renderRoute();

    expect(screen.queryByRole('button', { name: /Biografía/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fotos/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Recuerdos/ })).toBeInTheDocument();
  });

  it('shows the Biografía tab and its content when the feature toggle is on', async () => {
    useAppConfigStore.setState({ biografiaEnabled: true });
    const user = userEvent.setup();

    renderRoute();
    await user.click(screen.getByRole('button', { name: /Biografía/ }));

    expect(await screen.findByText('Contenido · Biografía')).toBeInTheDocument();
  });

  it('never resolves to the biografía content when the toggle is off, even if selected before', () => {
    renderRoute();

    expect(screen.queryByText('Contenido · Biografía')).not.toBeInTheDocument();
    expect(screen.getByText('Contenido · Fotos')).toBeInTheDocument();
  });
});
