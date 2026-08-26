// @vitest-environment jsdom
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from 'react-oidc-context';
import type { IncomingShare } from '@/features/sharing/native/shareReceiver';
import { ProtectedRoute, PublicRoute, RequireAuth } from './AuthGuards';

vi.mock('react-oidc-context', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: vi.fn(() => false), isPluginAvailable: vi.fn(() => false) },
}));

vi.mock('@sentry/react', () => ({
  captureException: vi.fn(),
}));

vi.mock('@/features/sharing/native/shareReceiver', () => ({
  ShareReceiver: {
    getPendingShare: vi.fn(),
  },
}));

vi.mock('@/features/sharing/useCases', () => ({
  loadShare: vi.fn(),
}));

const mockUseAuth = vi.mocked(useAuth);

describe('ProtectedRoute', () => {
  it('muestra una pantalla de carga (no un hueco en negro) mientras se resuelve la sesión', () => {
    mockUseAuth.mockReturnValue({ isLoading: true, isAuthenticated: false } as ReturnType<typeof useAuth>);

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>contenido protegido</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.queryByText('contenido protegido')).not.toBeInTheDocument();
    expect(screen.getByText('Cargando…')).toBeInTheDocument();
  });

  it('renderiza los hijos una vez autenticado', () => {
    mockUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: true } as ReturnType<typeof useAuth>);

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>contenido protegido</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('contenido protegido')).toBeInTheDocument();
  });
});

describe('RequireAuth', () => {
  it('renders children once authenticated, ignoring any pending native share', async () => {
    // RequireAuth deliberately has no pending-share logic at all — see /compartir's route
    // regression test below for why that matters.
    mockUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: true } as ReturnType<typeof useAuth>);
    const { useIncomingShareStore } = await import('@/store/useIncomingShareStore');
    useIncomingShareStore.setState({
      share: { shareId: 'share-1', files: [{ path: '/a.jpg', mimeType: 'image/jpeg', name: 'a.jpg' }] },
      selectedPhotos: [],
    });

    render(
      <MemoryRouter>
        <RequireAuth>
          <div>contenido protegido</div>
        </RequireAuth>
      </MemoryRouter>
    );

    expect(screen.getByText('contenido protegido')).toBeInTheDocument();

    useIncomingShareStore.setState({ share: null, selectedPhotos: [] });
  });
});

describe('/compartir route guard (regression: infinite self-redirect)', () => {
  afterEach(async () => {
    const { __resetPendingShareCheckForTests } = await import('@/features/sharing/native/pendingShareGate');
    __resetPendingShareCheckForTests();
    const { useIncomingShareStore } = await import('@/store/useIncomingShareStore');
    useIncomingShareStore.setState({ share: null, selectedPhotos: [] });
  });

  it('renders /compartir directly instead of bouncing to itself when a pending share is already loaded', async () => {
    // Reproduces the real App.tsx route wiring: /compartir must use RequireAuth (auth-only),
    // never ProtectedRoute. ProtectedRoute's "hasPendingShare -> Navigate('/compartir')" would
    // otherwise redirect this exact route to itself on every render, so SelectBaulForShareRoute
    // (the only screen that clears the pending share) would never mount — the user would be
    // stuck on a blank screen with no way out. This can't be covered end-to-end since it only
    // reproduces via a real Android share-sheet cold start, so this is the highest-level test
    // we can write for it.
    mockUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: true } as ReturnType<typeof useAuth>);
    const { useIncomingShareStore } = await import('@/store/useIncomingShareStore');
    useIncomingShareStore.setState({
      share: { shareId: 'share-1', files: [{ path: '/a.jpg', mimeType: 'image/jpeg', name: 'a.jpg' }] },
      selectedPhotos: [],
    });

    render(
      <MemoryRouter initialEntries={['/compartir']}>
        <Routes>
          <Route
            path="/compartir"
            element={
              <RequireAuth>
                <div>elegir baúl</div>
              </RequireAuth>
            }
          />
          <Route
            path="/baules"
            element={
              <ProtectedRoute>
                <div>baúl por defecto</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('elegir baúl')).toBeInTheDocument();
  });
});

describe('PublicRoute', () => {
  beforeEach(async () => {
    const { Capacitor } = await import('@capacitor/core');
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    vi.mocked(Capacitor.isPluginAvailable).mockReturnValue(false);
    const { ShareReceiver } = await import('@/features/sharing/native/shareReceiver');
    vi.mocked(ShareReceiver.getPendingShare).mockReset().mockResolvedValue({});
    const { loadShare } = await import('@/features/sharing/useCases');
    vi.mocked(loadShare).mockReset().mockResolvedValue(undefined);
  });

  afterEach(async () => {
    // Reset the module-level singleton so each test's Capacitor/ShareReceiver mocks are honored
    // instead of the previous test's cached "already checked" result.
    const { __resetPendingShareCheckForTests } = await import('@/features/sharing/native/pendingShareGate');
    __resetPendingShareCheckForTests();
    const { useIncomingShareStore } = await import('@/store/useIncomingShareStore');
    useIncomingShareStore.setState({ share: null, selectedPhotos: [] });
  });

  it('muestra una pantalla de carga (no un hueco en negro) mientras se resuelve la sesión', () => {
    mockUseAuth.mockReturnValue({ isLoading: true, isAuthenticated: false } as ReturnType<typeof useAuth>);

    render(
      <MemoryRouter>
        <PublicRoute>
          <div>contenido público</div>
        </PublicRoute>
      </MemoryRouter>
    );

    expect(screen.queryByText('contenido público')).not.toBeInTheDocument();
    expect(screen.getByText('Cargando…')).toBeInTheDocument();
  });

  it('redirects an authenticated cold start with a pending native share straight to /compartir, never rendering the default baúl destination first', async () => {
    mockUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: true } as ReturnType<typeof useAuth>);
    const { Capacitor } = await import('@capacitor/core');
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.isPluginAvailable).mockReturnValue(true);
    const { ShareReceiver } = await import('@/features/sharing/native/shareReceiver');
    let resolveGetPendingShare!: (value: { share?: IncomingShare }) => void;
    vi.mocked(ShareReceiver.getPendingShare).mockReturnValue(
      new Promise((resolve) => {
        resolveGetPendingShare = resolve;
      })
    );
    const { loadShare } = await import('@/features/sharing/useCases');
    const { useIncomingShareStore } = await import('@/store/useIncomingShareStore');
    // The real loadShare (features/sharing/useCases) populates useIncomingShareStore — mimic
    // that here, since usePendingShareGate's hasPendingShare reads that store.
    vi.mocked(loadShare).mockImplementation(async (share) => {
      useIncomingShareStore.setState({ share, selectedPhotos: [] });
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={
              <PublicRoute>
                <div>contenido público</div>
              </PublicRoute>
            }
          />
          <Route path="/baules" element={<div>baúl por defecto</div>} />
          <Route path="/compartir" element={<div>elegir baúl</div>} />
        </Routes>
      </MemoryRouter>
    );

    // While the native pending-share check is still in flight, the guard must not yet have
    // committed to the normal authenticated destination ("/baules") — that's the race this
    // regression covers.
    expect(screen.queryByText('baúl por defecto')).not.toBeInTheDocument();

    resolveGetPendingShare({ share: { shareId: 'share-1', files: [{ path: '/a.jpg', mimeType: 'image/jpeg', name: 'a.jpg' }] } });

    await waitFor(() => expect(loadShare).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText('elegir baúl')).toBeInTheDocument());
    expect(screen.queryByText('baúl por defecto')).not.toBeInTheDocument();
  });
});
