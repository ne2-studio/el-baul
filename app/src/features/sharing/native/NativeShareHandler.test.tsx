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

  it('loads a share and navigates to /compartir when a shareReceived event fires while authenticated', async () => {
    let shareReceivedCallback: ((share: IncomingShare) => void) | undefined;
    vi.mocked(ShareReceiver.addListener).mockImplementation((_event, callback) => {
      shareReceivedCallback = callback;
      return Promise.resolve({ remove: vi.fn() });
    });

    renderHandler();
    await waitFor(() => expect(shareReceivedCallback).toBeDefined());

    act(() => shareReceivedCallback!(pendingShare));

    await waitFor(() => expect(loadShare).toHaveBeenCalledWith(pendingShare));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/compartir'));
  });

  it('does not poll for a pending share on mount — that is AuthGuards.tsx/pendingShareGate.ts\'s job now', async () => {
    renderHandler();

    await act(async () => {
      await Promise.resolve();
    });
    expect(ShareReceiver.getPendingShare).not.toHaveBeenCalled();
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

  it('does not navigate if the component unmounts before loadShare resolves', async () => {
    let shareReceivedCallback: ((share: IncomingShare) => void) | undefined;
    vi.mocked(ShareReceiver.addListener).mockImplementation((_event, callback) => {
      shareReceivedCallback = callback;
      return Promise.resolve({ remove: vi.fn() });
    });
    let resolveLoadShare!: () => void;
    vi.mocked(loadShare).mockReturnValue(
      new Promise((resolve) => {
        resolveLoadShare = () => resolve(undefined);
      })
    );

    const { unmount } = renderHandler();
    await waitFor(() => expect(shareReceivedCallback).toBeDefined());
    act(() => shareReceivedCallback!(pendingShare));
    unmount();

    await act(async () => {
      resolveLoadShare();
      await Promise.resolve();
      await Promise.resolve();
    });

    // The `disposed` flag set on cleanup must stop openShare from navigating — otherwise this
    // would call navigate() on an already-unmounted screen.
    expect(loadShare).toHaveBeenCalledWith(pendingShare);
  });

  it('shows an error toast and does not navigate when loading the share fails', async () => {
    let shareReceivedCallback: ((share: IncomingShare) => void) | undefined;
    vi.mocked(ShareReceiver.addListener).mockImplementation((_event, callback) => {
      shareReceivedCallback = callback;
      return Promise.resolve({ remove: vi.fn() });
    });
    vi.mocked(loadShare).mockRejectedValue(new Error('boom'));

    renderHandler();
    await waitFor(() => expect(shareReceivedCallback).toBeDefined());
    act(() => shareReceivedCallback!(pendingShare));

    await waitFor(() => expect(useUIStore.getState().toastMessage).toBe('No se pudo cargar la foto compartida'));
    expect(screen.getByTestId('location')).toHaveTextContent('/');
  });
});
