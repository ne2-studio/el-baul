// @vitest-environment jsdom
import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AcceptBaulInviteRoute } from './AcceptBaulInviteRoute';
import { api } from '@/api';
import { useAuth } from 'react-oidc-context';
import { useCurrentBaulStore } from '@/store/useCurrentBaulStore';
import { useUIStore } from '@/store/uiStore';
import type { BaulInviteLinkPreview, ClaimablePersona, Persona } from '@/types';

vi.mock('react-oidc-context', () => ({
  useAuth: vi.fn(() => ({ isAuthenticated: true })),
}));

vi.mock('@/api', () => ({
  api: {
    baulInvites: {
      accept: vi.fn(),
      getClaimablePersonas: vi.fn(),
      getPreview: vi.fn(),
    },
  },
}));

function LocationProbe() {
  const location = useLocation();
  return <div>{location.pathname}{location.search}</div>;
}

function renderRoute(initialEntry = '/invitacion/baul/invite-token/aceptar') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/invitacion/baul/:token/aceptar" element={<AcceptBaulInviteRoute />} />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );
}

const persona = {
  id: 'persona-accepted',
  baulId: 'baul-joined',
  nickname: 'Ana',
} as Persona;

const claimablePersona = {
  id: 'persona-1',
  nickname: 'Abuela Ana',
  name: 'Ana García',
} as ClaimablePersona;

describe('AcceptBaulInviteRoute', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    localStorage.clear();
    useCurrentBaulStore.setState({ currentBaulId: null });
    useUIStore.setState({ showToast: false, toastMessage: '', toastVariant: 'success' });

    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as ReturnType<typeof useAuth>);
    vi.mocked(api.baulInvites.getClaimablePersonas).mockResolvedValue([]);
    vi.mocked(api.baulInvites.getPreview).mockResolvedValue({
      baulId: 'baul-joined',
      name: 'Baúl Familiar',
      previewPhotos: [],
      personaAvatarUrls: [],
    } as BaulInviteLinkPreview);
    vi.mocked(api.baulInvites.accept).mockResolvedValue(persona);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('redirects anonymous users to login and preserves the accept URL', () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false } as ReturnType<typeof useAuth>);

    renderRoute();

    expect(screen.getByText('/?redirectTo=%2Finvitacion%2Fbaul%2Finvite-token%2Faceptar')).toBeInTheDocument();
    expect(api.baulInvites.getClaimablePersonas).not.toHaveBeenCalled();
    expect(api.baulInvites.accept).not.toHaveBeenCalled();
  });

  it('auto-accepts when no personas can be claimed and makes the joined baúl current', async () => {
    vi.useFakeTimers();
    renderRoute();

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(api.baulInvites.accept).toHaveBeenCalledWith('invite-token', undefined);
    expect(useCurrentBaulStore.getState().currentBaulId).toBe('baul-joined');

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(screen.getByText('/baules/baul-joined')).toBeInTheDocument();
  });

  it('shows the persona selection branch and accepts the selected persona', async () => {
    const user = userEvent.setup();
    vi.mocked(api.baulInvites.getClaimablePersonas).mockResolvedValue([claimablePersona]);

    renderRoute();

    expect(await screen.findByRole('heading', { name: '¿Quién eres tú?' })).toBeInTheDocument();
    expect(screen.getByText('Elige tu perfil en Baúl Familiar')).toBeInTheDocument();

    await user.click(screen.getByText('Abuela Ana'));

    expect(api.baulInvites.accept).toHaveBeenCalledWith('invite-token', 'persona-1');
  });

  it('keeps selection available with a generic baúl name when preview fetch fails', async () => {
    vi.mocked(api.baulInvites.getClaimablePersonas).mockResolvedValue([claimablePersona]);
    vi.mocked(api.baulInvites.getPreview).mockRejectedValue(new Error('preview failed'));

    renderRoute();

    expect(await screen.findByRole('heading', { name: '¿Quién eres tú?' })).toBeInTheDocument();
    expect(screen.getByText('Elige tu perfil en el baúl')).toBeInTheDocument();
    expect(api.baulInvites.accept).not.toHaveBeenCalled();
  });

  it('falls back to auto-accept when claimable personas cannot be loaded', async () => {
    vi.mocked(api.baulInvites.getClaimablePersonas).mockRejectedValue(new Error('claimable failed'));

    renderRoute();

    await waitFor(() => {
      expect(api.baulInvites.accept).toHaveBeenCalledWith('invite-token', undefined);
    });
    expect(screen.queryByRole('heading', { name: '¿Quién eres tú?' })).not.toBeInTheDocument();
  });
});
