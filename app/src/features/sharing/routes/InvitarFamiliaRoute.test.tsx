// @vitest-environment jsdom
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Baul, Persona, PersonaInvite } from '@/types';
import { useBaulesStore } from '@/store/useBaulesStore';
import { usePersonasStore } from '@/store/usePersonasStore';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { useUIStore } from '@/store/uiStore';
import { InvitarFamiliaRoute } from './InvitarFamiliaRoute';

vi.mock('react-oidc-context', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

vi.mock('@/api', () => ({
  api: {
    baules: {
      invitePersona: vi.fn(),
      createPersona: vi.fn(),
    },
  },
}));

vi.mock('@/features/sharing/sharePublicLink', () => ({
  sharePublicLink: vi.fn(),
}));

import { api } from '@/api';
import { sharePublicLink } from '@/features/sharing/sharePublicLink';

const baulId = 'baul-1';

function baul(): Baul {
  return { id: baulId, name: 'Familia García', chapterCount: 0, role: 'administrador', isCustodio: true } as Baul;
}

function persona(overrides: Partial<Persona> = {}): Persona {
  return {
    id: 'p1', baulId, nickname: 'Tía Loli', status: 'pending', role: 'colaborador',
    isCustodio: false, invitedDate: 'hace 1 día', ...overrides,
  } as Persona;
}

function seedStores(personas: Persona[]) {
  useBaulesStore.setState({ baules: [baul()], chapters: { [baulId]: [] }, loosePhotos: { [baulId]: [] } });
  useRecuerdosStore.setState({ baulRecuerdos: { [baulId]: [] } });
  usePersonasStore.setState({ personas: { [baulId]: personas }, removalRequests: { [baulId]: [] }, personaPhotos: {}, taggedPersonas: {} });
}

function renderRoute() {
  return render(
    <MemoryRouter initialEntries={[`/baules/${baulId}/invitar`]}>
      <Routes>
        <Route path="/baules/:baulId/invitar" element={<InvitarFamiliaRoute />} />
        <Route path="/baules/:baulId" element={<div>Detalle del baúl</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('InvitarFamiliaRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUIStore.setState({ showToast: false, toastMessage: '' });
  });

  it('lists every persona in the baúl with an "Invitar" CTA for pending ones', () => {
    seedStores([persona({ nickname: 'Tía Loli', status: 'pending' }), persona({ id: 'p2', nickname: 'Yo', status: 'active' })]);

    renderRoute();

    expect(screen.getByText('Tía Loli')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Invitar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ya está dentro' })).toBeDisabled();
  });

  it('issues the invite token and shares it when "Invitar" is tapped', async () => {
    const user = userEvent.setup();
    seedStores([persona()]);
    vi.mocked(api.baules.invitePersona).mockResolvedValue(
      new PersonaInvite({ token: 'tok', url: 'https://api.el-baul.test/invitacion/baul/tok' })
    );

    renderRoute();
    await user.click(screen.getByRole('button', { name: 'Invitar' }));

    await waitFor(() => expect(api.baules.invitePersona).toHaveBeenCalledWith(baulId, 'p1'));
    expect(sharePublicLink).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://api.el-baul.test/invitacion/baul/tok',
    }));
  });

  it('opens "Invitar a otra persona", creates the persona, and immediately starts its invite', async () => {
    const user = userEvent.setup();
    seedStores([]);
    const created = persona({ id: 'p-new', nickname: 'Tío Juan' });
    vi.mocked(api.baules.createPersona).mockResolvedValue(created);
    vi.mocked(api.baules.invitePersona).mockResolvedValue(
      new PersonaInvite({ token: 'tok', url: 'https://api.el-baul.test/invitacion/baul/tok' })
    );

    renderRoute();
    await user.click(screen.getByText('Invitar a otra persona'));
    await user.type(screen.getByPlaceholderText('Ej. Abuela, Tío Juan…'), 'Tío Juan');
    await user.click(screen.getByRole('button', { name: /añadir/i }));

    await waitFor(() => expect(api.baules.createPersona).toHaveBeenCalledWith(baulId, 'Tío Juan'));
    await waitFor(() => expect(api.baules.invitePersona).toHaveBeenCalledWith(baulId, 'p-new'));
  });

  it('navigates back to the baúl', async () => {
    const user = userEvent.setup();
    seedStores([]);

    renderRoute();
    await user.click(screen.getByRole('button', { name: /volver|atrás|back/i }));

    expect(await screen.findByText('Detalle del baúl')).toBeInTheDocument();
  });
});
