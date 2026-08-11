import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useIncomingShareStore } from '@/store/useIncomingShareStore';
import { clear, loadShare } from './index';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    convertFileSrc: vi.fn((path: string) => `capacitor://localhost/_capacitor_file_${path}`),
  },
}));

vi.mock('@sentry/react', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

vi.mock('heic-to', () => ({
  isHeic: vi.fn(() => Promise.resolve(false)),
  heicTo: vi.fn(),
}));

import * as Sentry from '@sentry/react';
import type { IncomingShare } from '@/features/sharing/native/shareReceiver';

const originalCreateObjectURL = URL.createObjectURL;

function shareWithFiles(files: IncomingShare['files']): IncomingShare {
  return { shareId: 'share-1', files };
}

function okBlobResponse(contents: string, type = 'image/jpeg') {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    blob: vi.fn(() => Promise.resolve(new Blob([contents], { type }))),
  };
}

function emptyBlobResponse() {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    blob: vi.fn(() => Promise.resolve(new Blob([]))),
  };
}

describe('sharing useCases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'selected-1') });
    vi.stubGlobal('fetch', vi.fn());
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:preview'),
    });
    useIncomingShareStore.setState({ share: null, selectedPhotos: [] });
  });

  afterEach(() => {
    if (originalCreateObjectURL) {
      Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        value: originalCreateObjectURL,
      });
    } else {
      Reflect.deleteProperty(URL, 'createObjectURL');
    }
    vi.unstubAllGlobals();
  });

  it('stores photos that can be loaded and reports per-file failures without dropping the whole share', async () => {
    const share = shareWithFiles([
      { path: '/shared/a.jpg', name: 'a.jpg', mimeType: 'image/jpeg' },
      { path: '/shared/b.jpg', name: 'b.jpg', mimeType: 'image/jpeg' },
    ]);
    vi.mocked(fetch)
      .mockResolvedValueOnce(okBlobResponse('image-bytes') as unknown as Response)
      .mockResolvedValueOnce({ ok: false, status: 404, statusText: 'Not Found' } as Response);

    await loadShare(share);

    expect(fetch).toHaveBeenCalledWith('capacitor://localhost/_capacitor_file_/shared/a.jpg');
    expect(fetch).toHaveBeenCalledWith('capacitor://localhost/_capacitor_file_/shared/b.jpg');
    expect(Sentry.captureException).toHaveBeenCalledWith(expect.any(Error), {
      extra: { name: 'b.jpg', mimeType: 'image/jpeg', path: '/shared/b.jpg' },
    });
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
    expect(useIncomingShareStore.getState().share).toBe(share);
    expect(useIncomingShareStore.getState().selectedPhotos).toEqual([
      { id: 'selected-1', file: expect.any(File), preview: 'blob:preview' },
    ]);
    expect(useIncomingShareStore.getState().selectedPhotos[0].file.name).toBe('a.jpg');
  });

  it('reports an empty local blob as an item failure and emits the none-loaded message when every file fails', async () => {
    const share = shareWithFiles([{ path: '/shared/empty.jpg', name: 'empty.jpg', mimeType: 'image/jpeg' }]);
    vi.mocked(fetch).mockResolvedValueOnce(emptyBlobResponse() as unknown as Response);

    await loadShare(share);

    expect(Sentry.captureException).toHaveBeenCalledWith(expect.any(Error), {
      extra: { name: 'empty.jpg', mimeType: 'image/jpeg', path: '/shared/empty.jpg' },
    });
    expect(Sentry.captureMessage).toHaveBeenCalledWith('Incoming share had files but none could be loaded', {
      extra: { fileCount: 1 },
    });
    expect(useIncomingShareStore.getState()).toEqual({ share, selectedPhotos: [] });
  });

  it('reports fetch rejections as item failures and emits the none-loaded message only when files were present', async () => {
    const share = shareWithFiles([{ path: '/shared/missing.jpg', name: 'missing.jpg', mimeType: 'image/jpeg' }]);
    const fetchError = new Error('native file disappeared');
    vi.mocked(fetch).mockRejectedValueOnce(fetchError);

    await loadShare(share);

    expect(Sentry.captureException).toHaveBeenCalledWith(fetchError, {
      extra: { name: 'missing.jpg', mimeType: 'image/jpeg', path: '/shared/missing.jpg' },
    });
    expect(Sentry.captureMessage).toHaveBeenCalledWith('Incoming share had files but none could be loaded', {
      extra: { fileCount: 1 },
    });

    vi.clearAllMocks();
    const emptyShare = shareWithFiles([]);
    await loadShare(emptyShare);

    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
    expect(useIncomingShareStore.getState()).toEqual({ share: emptyShare, selectedPhotos: [] });
  });

  it('clears the incoming share state', () => {
    useIncomingShareStore.setState({
      share: shareWithFiles([{ path: '/shared/a.jpg', name: 'a.jpg', mimeType: 'image/jpeg' }]),
      selectedPhotos: [{ id: 'selected-1', file: new File(['image-bytes'], 'a.jpg'), preview: 'blob:preview' }],
    });

    clear();

    expect(useIncomingShareStore.getState()).toEqual({ share: null, selectedPhotos: [] });
  });
});
