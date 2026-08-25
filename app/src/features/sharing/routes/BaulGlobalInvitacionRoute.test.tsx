// @vitest-environment jsdom
import React from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BaulGlobalInvitacionRoute } from './BaulGlobalInvitacionRoute';
import { api } from '@/api';
import type { PersonaInvitePreview } from '@/types';

vi.mock('@/api', () => ({
  api: {
    personaInvites: {
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
    vi.mocked(api.personaInvites.getPreview).mockResolvedValue({
      baulId: 'baul-1',
      name: 'Baúl de los García',
      previewPhotos: [],
      personaAvatarUrls: [],
    } as PersonaInvitePreview);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('always routes through onboarding with the invite context, regardless of auth state', async () => {
    const user = userEvent.setup();
    renderRoute();

    await user.click(await screen.findByRole('button', { name: 'Unirme al Baúl' }));

    expect(api.personaInvites.getPreview).toHaveBeenCalledWith('invite-token');
    expect(screen.getByText('/onboarding?baulNombre=Ba%C3%BAl+de+los+Garc%C3%ADa&redirectTo=%2Finvitacion%2Fbaul%2Finvite-token%2Faceptar&token=invite-token')).toBeInTheDocument();
  });

  it('shows the invalid invitation fallback when preview loading fails', async () => {
    vi.mocked(api.personaInvites.getPreview).mockRejectedValue(new Error('revoked'));

    renderRoute();

    expect(await screen.findByRole('heading', { name: 'Invitación no encontrada' })).toBeInTheDocument();
  });
});
