// @vitest-environment jsdom
import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AcceptBaulInviteRoute } from './AcceptBaulInviteRoute';
import { api } from '@/api';
import { useAuth } from 'react-oidc-context';
import { useCurrentBaulStore } from '@/store/useCurrentBaulStore';
import { useUIStore } from '@/store/uiStore';
import type { Persona } from '@/types';

vi.mock('react-oidc-context', () => ({
  useAuth: vi.fn(() => ({ isAuthenticated: true })),
}));

vi.mock('@/api', () => ({
  api: {
    personaInvites: {
      accept: vi.fn(),
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

describe('AcceptBaulInviteRoute', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    localStorage.clear();
    useCurrentBaulStore.setState({ currentBaulId: null });
    useUIStore.setState({ showToast: false, toastMessage: '', toastVariant: 'success' });

    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as ReturnType<typeof useAuth>);
    vi.mocked(api.personaInvites.accept).mockResolvedValue(persona);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('redirects anonymous users to login and preserves the accept URL', () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false } as ReturnType<typeof useAuth>);

    renderRoute();

    expect(screen.getByText('/?redirectTo=%2Finvitacion%2Fbaul%2Finvite-token%2Faceptar%3Fentry%3Dlink')).toBeInTheDocument();
    expect(api.personaInvites.accept).not.toHaveBeenCalled();
  });

  it('accepts the token directly — no "¿Quién eres tú?" step — and makes the joined baúl current', async () => {
    vi.useFakeTimers();
    renderRoute();

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(api.personaInvites.accept).toHaveBeenCalledWith('invite-token');
    expect(useCurrentBaulStore.getState().currentBaulId).toBe('baul-joined');
    expect(screen.queryByRole('heading', { name: '¿Quién eres tú?' })).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(screen.getByText('/baules/baul-joined')).toBeInTheDocument();
  });

  it('shows an error screen when acceptance fails', async () => {
    vi.mocked(api.personaInvites.accept).mockRejectedValue(new Error('Invitation not found'));

    renderRoute();

    expect(await screen.findByRole('heading', { name: 'Ups! Algo ha ido mal' })).toBeInTheDocument();
    expect(screen.getByText('Invitation not found')).toBeInTheDocument();
  });
});
