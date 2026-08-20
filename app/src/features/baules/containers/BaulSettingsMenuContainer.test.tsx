// @vitest-environment jsdom
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Baul } from '@/types';
import { usePersonasStore } from '@/store/usePersonasStore';
import { BaulSettingsMenuContainer } from './BaulSettingsMenuContainer';

vi.mock('@/api', () => ({
  api: {
    baules: { getInviteLink: vi.fn(), regenerateInviteLink: vi.fn() },
  },
}));

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
        <Route path="/baules/:baulId/ajustes" element={<div>Ajustes del baúl</div>} />
        <Route path="/cuenta" element={<div>Mi cuenta</div>} />
        <Route path="/ayuda" element={<div>Ayuda</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('BaulSettingsMenuContainer', () => {
  beforeEach(() => {
    usePersonasStore.setState({ personas: {}, removalRequests: {}, personaPhotos: {}, taggedPersonas: {} });
    vi.clearAllMocks();
  });

  it('always shows the menu trigger, even for a role with no baúl-management permissions', () => {
    renderContainer(baul({ role: 'colaborador', isCustodio: false }));

    expect(screen.getByRole('button', { name: 'Menú' })).toBeInTheDocument();
  });

  it('hides "Ajustes del baúl" for a role with no baúl-management permissions', async () => {
    const user = userEvent.setup();
    renderContainer(baul({ role: 'colaborador', isCustodio: false }));

    await user.click(screen.getByRole('button', { name: 'Menú' }));

    expect(screen.queryByText('Ajustes del baúl')).not.toBeInTheDocument();
    expect(await screen.findByText('Mi cuenta')).toBeInTheDocument();
    expect(screen.getByText('Ayuda')).toBeInTheDocument();
  });

  it('navigates to the baúl settings screen for a custodio', async () => {
    const user = userEvent.setup();
    renderContainer(baul());

    await user.click(screen.getByRole('button', { name: 'Menú' }));
    await user.click(await screen.findByText('Ajustes del baúl'));

    expect(await screen.findByText('Ajustes del baúl')).toBeInTheDocument();
  });

  it('navigates to "Mi cuenta"', async () => {
    const user = userEvent.setup();
    renderContainer(baul());

    await user.click(screen.getByRole('button', { name: 'Menú' }));
    await user.click(await screen.findByText('Mi cuenta'));

    expect(await screen.findByText('Mi cuenta')).toBeInTheDocument();
  });

  it('navigates to "Ayuda"', async () => {
    const user = userEvent.setup();
    renderContainer(baul());

    await user.click(screen.getByRole('button', { name: 'Menú' }));
    await user.click(await screen.findByText('Ayuda'));

    expect(await screen.findByText('Ayuda')).toBeInTheDocument();
  });
});
