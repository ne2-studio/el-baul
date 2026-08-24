// @vitest-environment jsdom
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

import { Capacitor } from '@capacitor/core';
import { ShareReceiver, type IncomingShare } from '@/features/sharing/native/shareReceiver';
import { loadShare } from '@/features/sharing/useCases';
import { useIncomingShareStore } from '@/store/useIncomingShareStore';
import { usePendingShareGate, __resetPendingShareCheckForTests } from './pendingShareGate';

// The real loadShare (features/sharing/useCases) populates useIncomingShareStore — mimic that
// here instead of a bare mockResolvedValue(undefined), since usePendingShareGate's
// hasPendingShare reads that store, not loadShare's return value.
function mockLoadShareToPopulateStore() {
  vi.mocked(loadShare).mockImplementation(async (share) => {
    useIncomingShareStore.setState({ share, selectedPhotos: [] });
  });
}

const pendingShare: IncomingShare = { shareId: 'share-1', files: [{ path: '/a.jpg', mimeType: 'image/jpeg', name: 'a.jpg' }] };

function Probe({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { isChecking, hasPendingShare } = usePendingShareGate(isAuthenticated);
  return (
    <div>
      <div data-testid="checking">{String(isChecking)}</div>
      <div data-testid="pending">{String(hasPendingShare)}</div>
    </div>
  );
}

describe('usePendingShareGate', () => {
  beforeEach(() => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    vi.mocked(Capacitor.isPluginAvailable).mockReturnValue(false);
    vi.mocked(ShareReceiver.getPendingShare).mockReset().mockResolvedValue({});
    vi.mocked(loadShare).mockReset().mockResolvedValue(undefined);
    useIncomingShareStore.setState({ share: null, selectedPhotos: [] });
    __resetPendingShareCheckForTests();
  });

  afterEach(() => {
    __resetPendingShareCheckForTests();
  });

  it('resolves immediately with nothing pending while unauthenticated, without calling the native plugin', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.isPluginAvailable).mockReturnValue(true);

    render(<Probe isAuthenticated={false} />);

    expect(screen.getByTestId('checking')).toHaveTextContent('false');
    expect(screen.getByTestId('pending')).toHaveTextContent('false');
    expect(ShareReceiver.getPendingShare).not.toHaveBeenCalled();
  });

  it('resolves immediately on web/iOS (no ShareReceiver plugin), with no added latency', async () => {
    render(<Probe isAuthenticated={true} />);

    await waitFor(() => expect(screen.getByTestId('checking')).toHaveTextContent('false'));
    expect(screen.getByTestId('pending')).toHaveTextContent('false');
    expect(ShareReceiver.getPendingShare).not.toHaveBeenCalled();
  });

  it('loads a pending share on Android and reports it once resolved', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.isPluginAvailable).mockReturnValue(true);
    mockLoadShareToPopulateStore();
    let resolveGetPendingShare!: (value: { share?: IncomingShare }) => void;
    vi.mocked(ShareReceiver.getPendingShare).mockReturnValue(
      new Promise((resolve) => {
        resolveGetPendingShare = resolve;
      })
    );

    render(<Probe isAuthenticated={true} />);

    expect(screen.getByTestId('checking')).toHaveTextContent('true');

    resolveGetPendingShare({ share: pendingShare });

    await waitFor(() => expect(loadShare).toHaveBeenCalledWith(pendingShare));
    await waitFor(() => expect(screen.getByTestId('checking')).toHaveTextContent('false'));
    expect(screen.getByTestId('pending')).toHaveTextContent('true');
  });

  it('only calls the native plugin once even if multiple guards mount', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.isPluginAvailable).mockReturnValue(true);
    vi.mocked(ShareReceiver.getPendingShare).mockResolvedValue({});

    render(
      <>
        <Probe isAuthenticated={true} />
        <Probe isAuthenticated={true} />
      </>
    );

    await waitFor(() => expect(screen.getAllByTestId('checking')[0]).toHaveTextContent('false'));
    expect(ShareReceiver.getPendingShare).toHaveBeenCalledTimes(1);
  });
});
