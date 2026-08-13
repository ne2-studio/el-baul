// @vitest-environment jsdom
import React from 'react';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TvLandingRoute } from './TvLandingRoute';
import { api, ApiError } from '@/api';
import { TvPairing, TvPairingStatus } from '@/types';

vi.mock('@/api', async () => {
  const actual = await vi.importActual<typeof import('@/api')>('@/api');
  return {
    ...actual,
    api: {
      tvPairings: {
        create: vi.fn(),
        getStatus: vi.fn(),
      },
    },
  };
});

function TvSessionStub() {
  const { token } = useParams<{ token: string }>();
  return <div>Sesión {token}</div>;
}

function renderRoute() {
  return render(
    <MemoryRouter initialEntries={['/tv']}>
      <Routes>
        <Route path="/tv" element={<TvLandingRoute />} />
        <Route path="/tv/:token" element={<TvSessionStub />} />
      </Routes>
    </MemoryRouter>
  );
}

function pairing(overrides: Partial<{ code: string; claimUrl: string; expiresAt: string }> = {}) {
  return new TvPairing({
    code: 'abc123',
    claimUrl: 'https://app.el-baul.test/tv/vincular/abc123',
    expiresAt: new Date(Date.now() + 600_000).toISOString(),
    ...overrides,
  });
}

describe('TvLandingRoute', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates a pairing on mount and shows its QR code', async () => {
    vi.mocked(api.tvPairings.create).mockResolvedValue(pairing());
    vi.mocked(api.tvPairings.getStatus).mockResolvedValue(new TvPairingStatus({ claimed: false, sessionToken: null }));

    renderRoute();
    await act(async () => {});

    expect(api.tvPairings.create).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Escanea este código con tu móvil para elegir el baúl que quieres ver aquí.')).toBeInTheDocument();
  });

  it('navigates to the session route once the pairing is claimed', async () => {
    vi.mocked(api.tvPairings.create).mockResolvedValue(pairing());
    vi.mocked(api.tvPairings.getStatus).mockResolvedValue(
      new TvPairingStatus({ claimed: true, sessionToken: 'session-token' })
    );

    renderRoute();
    await act(async () => {});
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(screen.getByText('Sesión session-token')).toBeInTheDocument();
  });

  it('mints a fresh pairing once the current one goes stale', async () => {
    vi.mocked(api.tvPairings.create)
      .mockResolvedValueOnce(pairing({ code: 'stale' }))
      .mockResolvedValueOnce(pairing({ code: 'fresh' }));
    vi.mocked(api.tvPairings.getStatus).mockRejectedValue(new ApiError(404, 'not found', {}));

    renderRoute();
    await act(async () => {});
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(api.tvPairings.create).toHaveBeenCalledTimes(2);
  });
});
