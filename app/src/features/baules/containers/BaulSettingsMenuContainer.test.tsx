// @vitest-environment jsdom
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Baul } from '@/types';
import { usePersonasStore } from '@/store/usePersonasStore';
import { BaulSettingsMenuContainer } from './BaulSettingsMenuContainer';

vi.mock('@/features/baules/useCases', () => ({
  renameBaul: vi.fn(),
  setBaulCover: vi.fn(),
}));

vi.mock('@/api', () => ({
  api: {
    baules: { getInviteLink: vi.fn(), regenerateInviteLink: vi.fn() },
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

function renderContainer(b: Baul) {
  return render(
    <MemoryRouter initialEntries={[`/baules/${b.id}`]}>
      <Routes>
        <Route path="/baules/:baulId" element={<BaulSettingsMenuContainer baul={b} />} />
        <Route path="/baules/:baulId/solicitar-borrado" element={<div>Solicitar borrado</div>} />
        <Route path="/eliminar-solicitudes/:baulId" element={<div>Solicitudes de eliminación</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('BaulSettingsMenuContainer', () => {
  beforeEach(() => {
    usePersonasStore.setState({ personas: {}, removalRequests: {}, personaPhotos: {}, taggedPersonas: {} });
    vi.clearAllMocks();
  });

  it('renders nothing for a role with no baúl-settings permissions', () => {
    renderContainer(baul({ role: 'colaborador', isCustodio: false }));

    expect(screen.queryByRole('button', { name: 'Opciones del baúl' })).not.toBeInTheDocument();
  });

  it('shows the menu trigger for a custodio', () => {
    renderContainer(baul());

    expect(screen.getByRole('button', { name: 'Opciones del baúl' })).toBeInTheDocument();
  });

  it('edits the baúl info and closes the modal on success', async () => {
    const user = userEvent.setup();
    vi.mocked(renameBaul).mockResolvedValue(undefined);

    renderContainer(baul());
    await user.click(screen.getByRole('button', { name: 'Opciones del baúl' }));
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

    renderContainer(baul());
    await user.click(screen.getByRole('button', { name: 'Opciones del baúl' }));
    await user.click(await screen.findByText('Eliminar baúl'));

    expect(screen.getByText('Solicitar borrado')).toBeInTheDocument();
  });

  it('shows the removal-requests item with a badge only when there are pending ones', async () => {
    const user = userEvent.setup();
    usePersonasStore.setState({ removalRequests: { 'baul-1': [{ id: 'r1', status: 'pending' } as never] } });

    renderContainer(baul());
    await user.click(screen.getByRole('button', { name: 'Opciones del baúl' }));

    expect(await screen.findByText('Solicitudes de eliminación')).toBeInTheDocument();
  });
});
