// @vitest-environment jsdom
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Baul } from '@/types';
import { useBaulesStore } from '@/store/useBaulesStore';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { usePersonasStore } from '@/store/usePersonasStore';
import { BaulSettingsRoute } from './BaulSettingsRoute';

vi.mock('react-oidc-context', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

vi.mock('@/features/baules/useCases', () => ({
  renameBaul: vi.fn(),
  setBaulCover: vi.fn(),
  loadChapters: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/api', () => ({
  api: {
    photos: { getPage: vi.fn() },
  },
}));

import { renameBaul } from '@/features/baules/useCases';

function baul(overrides: Partial<Baul> = {}): Baul {
  return {
    id: 'baul-1', name: 'Familia García', chapterCount: 3, lastUpdated: 'hace 2 días',
    role: 'administrador', isCustodio: true, ...overrides,
  } as Baul;
}

function renderRoute(b: Baul) {
  useBaulesStore.setState({
    baules: [b],
    chapters: { [b.id]: [] },
    loosePhotos: { [b.id]: [] },
    isLoading: false,
  });
  useRecuerdosStore.setState({ baulRecuerdos: { [b.id]: [] } });
  usePersonasStore.setState({ personas: { [b.id]: [] } });

  return render(
    <MemoryRouter initialEntries={[`/baules/${b.id}/ajustes`]}>
      <Routes>
        <Route path="/baules/:baulId/ajustes" element={<BaulSettingsRoute />} />
        <Route path="/baules/:baulId" element={<div>Pantalla del baúl</div>} />
        <Route path="/baules/:baulId/solicitar-borrado" element={<div>Solicitar borrado</div>} />
        <Route path="/eliminar-solicitudes/:baulId" element={<div>Solicitudes de eliminación</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('BaulSettingsRoute', () => {
  beforeEach(() => {
    usePersonasStore.setState({ personas: {}, removalRequests: {}, personaPhotos: {}, taggedPersonas: {} });
    vi.clearAllMocks();
  });

  it('shows the management items for a custodio', async () => {
    renderRoute(baul());

    expect(await screen.findByText('Ajustes del baúl')).toBeInTheDocument();
    expect(screen.getByText('Elegir foto de portada')).toBeInTheDocument();
    expect(screen.getByText('Editar información del baúl')).toBeInTheDocument();
    expect(screen.getByText('Zona de peligro')).toBeInTheDocument();
    expect(screen.getByText('Eliminar baúl')).toBeInTheDocument();
  });

  it('hides all items for a role with no baúl-management permissions', async () => {
    renderRoute(baul({ role: 'colaborador', isCustodio: false }));

    expect(await screen.findByText('Ajustes del baúl')).toBeInTheDocument();
    expect(screen.queryByText('Elegir foto de portada')).not.toBeInTheDocument();
    expect(screen.queryByText('Editar información del baúl')).not.toBeInTheDocument();
    expect(screen.queryByText('Zona de peligro')).not.toBeInTheDocument();
  });

  it('edits the baúl info and closes the modal on success', async () => {
    const user = userEvent.setup();
    vi.mocked(renameBaul).mockResolvedValue(undefined);

    renderRoute(baul());
    await user.click(await screen.findByText('Editar información del baúl'));
    const nameInput = await screen.findByDisplayValue('Familia García');
    await user.clear(nameInput);
    await user.type(nameInput, 'Familia Pérez');
    await user.click(screen.getByRole('button', { name: /^guardar$/i }));

    expect(renameBaul).toHaveBeenCalledWith('baul-1', 'Familia Pérez', '');
    await waitFor(() => expect(screen.queryByDisplayValue('Familia Pérez')).not.toBeInTheDocument());
  });

  it('navigates to the deletion request screen', async () => {
    const user = userEvent.setup();
    renderRoute(baul());

    await user.click(await screen.findByText('Eliminar baúl'));

    expect(await screen.findByText('Solicitar borrado')).toBeInTheDocument();
  });

  it('shows the removal-requests item with its pending count', async () => {
    const b = baul();
    usePersonasStore.setState({ removalRequests: { [b.id]: [{ id: 'r1', status: 'pending' } as never] } });

    renderRoute(b);

    expect(await screen.findByText('Solicitudes de eliminación')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('navigates back to the baúl screen', async () => {
    const user = userEvent.setup();
    renderRoute(baul());

    await screen.findByText('Ajustes del baúl');
    await user.click(screen.getByRole('button', { name: 'Volver' }));

    expect(await screen.findByText('Pantalla del baúl')).toBeInTheDocument();
  });
});
