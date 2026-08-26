// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: vi.fn(() => true), isPluginAvailable: vi.fn(() => true) },
}));

vi.mock('@capacitor/app', () => ({
  App: { addListener: vi.fn() },
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

vi.mock('@/features/sharing/useCases', () => ({
  loadShare: vi.fn().mockResolvedValue(undefined),
}));

import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { ShareReceiver, type IncomingShare } from '@/features/sharing/native/shareReceiver';
import { loadShare } from '@/features/sharing/useCases';
import { useIncomingShareStore } from '@/store/useIncomingShareStore';
import { useIncomingShareController } from './incomingShareController';

const share: IncomingShare = { shareId: 'share-1', files: [{ path: '/a.jpg', mimeType: 'image/jpeg', name: 'a.jpg' }] };
const otherShare: IncomingShare = { shareId: 'share-2', files: [{ path: '/b.jpg', mimeType: 'image/jpeg', name: 'b.jpg' }] };

describe('useIncomingShareController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.isPluginAvailable).mockReturnValue(true);
    vi.mocked(ShareReceiver.addListener).mockResolvedValue({ remove: vi.fn() });
    vi.mocked(ShareReceiver.getPendingShare).mockResolvedValue({});
    vi.mocked(CapacitorApp.addListener).mockResolvedValue({ remove: vi.fn() });
    vi.mocked(loadShare).mockResolvedValue(undefined);
    useIncomingShareStore.setState({ share: null, selectedPhotos: [] });
  });

  it('does nothing on a non-native platform', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);

    renderHook(() => useIncomingShareController());
    await Promise.resolve();

    expect(ShareReceiver.addListener).not.toHaveBeenCalled();
    expect(ShareReceiver.getPendingShare).not.toHaveBeenCalled();
    expect(CapacitorApp.addListener).not.toHaveBeenCalled();
  });

  it('does nothing when the native platform has no ShareReceiver plugin (e.g. iOS)', async () => {
    vi.mocked(Capacitor.isPluginAvailable).mockReturnValue(false);

    renderHook(() => useIncomingShareController());
    await Promise.resolve();

    expect(ShareReceiver.addListener).not.toHaveBeenCalled();
    expect(ShareReceiver.getPendingShare).not.toHaveBeenCalled();
  });

  it('polls getPendingShare on mount and loads a non-empty result', async () => {
    vi.mocked(ShareReceiver.getPendingShare).mockResolvedValue({ share });

    renderHook(() => useIncomingShareController());
    await Promise.resolve();
    await Promise.resolve();

    expect(loadShare).toHaveBeenCalledWith(share);
  });

  it('loads a share delivered via the shareReceived event', async () => {
    let shareReceivedCallback: ((share: IncomingShare) => void) | undefined;
    vi.mocked(ShareReceiver.addListener).mockImplementation((_event, callback) => {
      shareReceivedCallback = callback;
      return Promise.resolve({ remove: vi.fn() });
    });

    renderHook(() => useIncomingShareController());
    await Promise.resolve();
    await Promise.resolve();

    shareReceivedCallback!(share);
    await Promise.resolve();

    expect(loadShare).toHaveBeenCalledWith(share);
  });

  it('re-polls getPendingShare on every native resume, not just once per session', async () => {
    let resumeCallback: (() => void) | undefined;
    vi.mocked(CapacitorApp.addListener).mockImplementation((async (...args: unknown[]) => {
      const [event, callback] = args as [string, () => void];
      if (event === 'resume') resumeCallback = callback;
      return { remove: vi.fn() };
    }) as unknown as typeof CapacitorApp.addListener);

    renderHook(() => useIncomingShareController());
    await Promise.resolve();
    await Promise.resolve();
    expect(ShareReceiver.getPendingShare).toHaveBeenCalledTimes(1);

    resumeCallback!();
    await Promise.resolve();
    await Promise.resolve();
    expect(ShareReceiver.getPendingShare).toHaveBeenCalledTimes(2);

    resumeCallback!();
    await Promise.resolve();
    await Promise.resolve();
    expect(ShareReceiver.getPendingShare).toHaveBeenCalledTimes(3);
  });

  it('does not reload the same share twice (dedupe by shareId)', async () => {
    useIncomingShareStore.setState({ share, selectedPhotos: [] });
    vi.mocked(ShareReceiver.getPendingShare).mockResolvedValue({ share });

    renderHook(() => useIncomingShareController());
    await Promise.resolve();
    await Promise.resolve();

    expect(loadShare).not.toHaveBeenCalled();
  });

  it('does load a different share than the one already pending', async () => {
    useIncomingShareStore.setState({ share, selectedPhotos: [] });
    vi.mocked(ShareReceiver.getPendingShare).mockResolvedValue({ share: otherShare });

    renderHook(() => useIncomingShareController());
    await Promise.resolve();
    await Promise.resolve();

    expect(loadShare).toHaveBeenCalledWith(otherShare);
  });
});
