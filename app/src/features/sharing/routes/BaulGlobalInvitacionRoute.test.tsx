// @vitest-environment jsdom
import React from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BaulGlobalInvitacionRoute } from './BaulGlobalInvitacionRoute';
import { api } from '@/api';
import { useAuth } from 'react-oidc-context';
import type { BaulInviteLinkPreview } from '@/types';

vi.mock('react-oidc-context', () => ({
  useAuth: vi.fn(() => ({ isAuthenticated: true })),
}));

vi.mock('@/api', () => ({
  api: {
    baulInvites: {
      getPreview: vi.fn(),
    },
  },
}));

function LocationProbe() {
  const location = useLocation();
  return <div>{location.pathname}{location.search}</div>;
}

function renderRoute() {
  return render(
    <MemoryRouter initialEntries={['/invitacion/baul/invite-token']}>
      <Routes>
        <Route path="/invitacion/baul/:token" element={<BaulGlobalInvitacionRoute />} />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('BaulGlobalInvitacionRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // The route logs the caught error to console.error before showing the fallback — silence the noise.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as ReturnType<typeof useAuth>);
    vi.mocked(api.baulInvites.getPreview).mockResolvedValue({
      baulId: 'baul-1',
      name: 'Baúl de los García',
      previewPhotos: [],
      personaAvatarUrls: [],
    } as BaulInviteLinkPreview);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends authenticated users straight to the accept route', async () => {
    const user = userEvent.setup();
    renderRoute();

    await user.click(await screen.findByRole('button', { name: 'Unirme al Baúl' }));

    expect(api.baulInvites.getPreview).toHaveBeenCalledWith('invite-token');
    expect(screen.getByText('/invitacion/baul/invite-token/aceptar')).toBeInTheDocument();
  });

  it('sends anonymous users to login with the accept route encoded', async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false } as ReturnType<typeof useAuth>);

    renderRoute();

    await user.click(await screen.findByRole('button', { name: 'Unirme al Baúl' }));

    expect(screen.getByText('/?redirectTo=%2Finvitacion%2Fbaul%2Finvite-token%2Faceptar')).toBeInTheDocument();
  });

  it('keeps the public onboarding detour public and passes the invite context', async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false } as ReturnType<typeof useAuth>);

    renderRoute();

    await user.click(await screen.findByRole('button', { name: 'Ver de qué va esto' }));

    expect(screen.getByText('/onboarding?baulNombre=Ba%C3%BAl+de+los+Garc%C3%ADa&redirectTo=%2Finvitacion%2Fbaul%2Finvite-token%2Faceptar&token=invite-token')).toBeInTheDocument();
  });

  it('shows the invalid invitation fallback when preview loading fails', async () => {
    vi.mocked(api.baulInvites.getPreview).mockRejectedValue(new Error('revoked'));

    renderRoute();

    expect(await screen.findByRole('heading', { name: 'Invitación no encontrada' })).toBeInTheDocument();
  });
});
