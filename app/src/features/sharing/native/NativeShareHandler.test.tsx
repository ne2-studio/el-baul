// @vitest-environment jsdom
import { MemoryRouter, useLocation } from 'react-router-dom';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUIStore } from '@/store/uiStore';
import { NativeShareHandler } from './NativeShareHandler';

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: vi.fn(() => true), isPluginAvailable: vi.fn(() => true) },
}));

vi.mock('@sentry/react', () => ({
  captureException: vi.fn(),
}));

vi.mock('@/features/sharing/native/shareReceiver', () => ({
  ShareReceiver: {
    addListener: vi.fn(),
    getPendingShare: vi.fn(),
  },
}));

vi.mock('react-oidc-context', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/features/sharing/useCases', () => ({
  loadShare: vi.fn().mockResolvedValue(undefined),
}));

import { Capacitor } from '@capacitor/core';
import { ShareReceiver, type IncomingShare } from '@/features/sharing/native/shareReceiver';
import { useAuth } from 'react-oidc-context';
import { loadShare } from '@/features/sharing/useCases';

const pendingShare: IncomingShare = { shareId: 'share-1', files: [{ path: '/a.jpg', mimeType: 'image/jpeg', name: 'a.jpg' }] };

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderHandler() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <NativeShareHandler />
      <LocationDisplay />
    </MemoryRouter>
  );
}

describe('NativeShareHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.isPluginAvailable).mockReturnValue(true);
    vi.mocked(ShareReceiver.addListener).mockResolvedValue({ remove: vi.fn() });
    vi.mocked(ShareReceiver.getPendingShare).mockResolvedValue({});
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as ReturnType<typeof useAuth>);
    vi.mocked(loadShare).mockClear().mockResolvedValue(undefined);
    useUIStore.setState({ showToast: false, toastMessage: '' });
  });

  it('does nothing on a non-native platform', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);

    renderHandler();

    await act(async () => {
      await Promise.resolve();
    });
    expect(ShareReceiver.addListener).not.toHaveBeenCalled();
    expect(ShareReceiver.getPendingShare).not.toHaveBeenCalled();
  });

  it('does nothing when the native platform has no ShareReceiver plugin (e.g. iOS)', async () => {
    vi.mocked(Capacitor.isPluginAvailable).mockReturnValue(false);

    renderHandler();

    await act(async () => {
      await Promise.resolve();
    });
    expect(ShareReceiver.addListener).not.toHaveBeenCalled();
    expect(ShareReceiver.getPendingShare).not.toHaveBeenCalled();
    expect(useUIStore.getState().showToast).toBe(false);
  });

  it('loads a pending share and navigates to /compartir when authenticated', async () => {
    vi.mocked(ShareReceiver.getPendingShare).mockResolvedValue({ share: pendingShare });

    renderHandler();

    await waitFor(() => expect(loadShare).toHaveBeenCalledWith(pendingShare));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/compartir'));
  });

  it('does not check for a pending share while unauthenticated', async () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false } as ReturnType<typeof useAuth>);

    renderHandler();

    await act(async () => {
      await Promise.resolve();
    });
    expect(ShareReceiver.getPendingShare).not.toHaveBeenCalled();
  });

  it('picks up an already-pending share once auth flips from false to true', async () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false } as ReturnType<typeof useAuth>);
    vi.mocked(ShareReceiver.getPendingShare).mockResolvedValue({ share: pendingShare });

    const { rerender } = renderHandler();
    await act(async () => {
      await Promise.resolve();
    });
    expect(ShareReceiver.getPendingShare).not.toHaveBeenCalled();

    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as ReturnType<typeof useAuth>);
    rerender(
      <MemoryRouter initialEntries={['/']}>
        <NativeShareHandler />
        <LocationDisplay />
      </MemoryRouter>
    );

    await waitFor(() => expect(ShareReceiver.getPendingShare).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/compartir'));
  });

  it('ignores a shareReceived event fired while unauthenticated', async () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false } as ReturnType<typeof useAuth>);
    let shareReceivedCallback: ((share: IncomingShare) => void) | undefined;
    vi.mocked(ShareReceiver.addListener).mockImplementation((_event, callback) => {
      shareReceivedCallback = callback;
      return Promise.resolve({ remove: vi.fn() });
    });

    renderHandler();
    await waitFor(() => expect(shareReceivedCallback).toBeDefined());

    act(() => shareReceivedCallback!(pendingShare));
    await act(async () => {
      await Promise.resolve();
    });

    expect(loadShare).not.toHaveBeenCalled();
  });

  it('does not navigate if the component unmounts before getPendingShare resolves', async () => {
    let resolveShare!: (value: { share?: IncomingShare }) => void;
    vi.mocked(ShareReceiver.getPendingShare).mockReturnValue(
      new Promise((resolve) => {
        resolveShare = resolve;
      })
    );

    const { unmount } = renderHandler();
    unmount();

    await act(async () => {
      resolveShare({ share: pendingShare });
      await Promise.resolve();
      await Promise.resolve();
    });

    // The `disposed` flag set on cleanup must stop openShare from proceeding — otherwise
    // this would call loadShare and navigate() on an already-unmounted screen.
    expect(loadShare).not.toHaveBeenCalled();
  });

  it('shows an error toast and does not navigate when loading the share fails', async () => {
    vi.mocked(ShareReceiver.getPendingShare).mockResolvedValue({ share: pendingShare });
    vi.mocked(loadShare).mockRejectedValue(new Error('boom'));

    renderHandler();

    await waitFor(() => expect(useUIStore.getState().toastMessage).toBe('No se pudo cargar la foto compartida'));
    expect(screen.getByTestId('location')).toHaveTextContent('/');
  });
});
