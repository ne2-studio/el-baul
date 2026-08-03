import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  materializeSelectedPhoto,
  materializeSharedPhoto,
  resolvePhotoRouteContext,
  uploadItemsFromSelectedPhotos,
} from './index';

vi.mock('@sentry/react', () => ({
  captureException: vi.fn(),
}));

vi.mock('heic-to', () => ({
  isHeic: vi.fn(() => Promise.resolve(false)),
  heicTo: vi.fn(),
}));

import * as Sentry from '@sentry/react';
import { heicTo, isHeic } from 'heic-to';

const originalCreateObjectURL = URL.createObjectURL;

describe('uploadFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isHeic).mockResolvedValue(false);
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'selected-1') });
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:preview'),
    });
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

  it('materializes a selected file into a fresh blob-backed File with preview metadata', async () => {
    const original = new File(['image-bytes'], 'foto.jpg', {
      type: 'image/jpeg',
      lastModified: 123,
    });

    const selected = await materializeSelectedPhoto(original);

    expect(selected).toEqual({
      id: 'selected-1',
      file: expect.any(File),
      preview: 'blob:preview',
    });
    expect(selected?.file).not.toBe(original);
    expect(selected?.file.name).toBe('foto.jpg');
    expect(selected?.file.type).toBe('image/jpeg');
    expect(selected?.file.lastModified).toBe(123);
    expect(await selected?.file.text()).toBe('image-bytes');
    expect(URL.createObjectURL).toHaveBeenCalledWith(selected?.file);
  });

  it('reports unreadable picked files and drops them from the selected-photo flow', async () => {
    const unreadable = {
      name: 'caducada.jpg',
      size: 100,
      type: 'image/jpeg',
      arrayBuffer: () => Promise.reject(new Error('content uri expired')),
    } as unknown as File;

    await expect(materializeSelectedPhoto(unreadable)).resolves.toBeNull();
    expect(Sentry.captureException).toHaveBeenCalledWith(expect.any(Error), {
      tags: { phase: 'read-file-on-select' },
      extra: { name: 'caducada.jpg', size: 100, type: 'image/jpeg' },
    });
  });

  it('materializes a native shared blob as a selected photo using the blob as preview source', async () => {
    const blob = new Blob(['shared-bytes'], { type: 'image/png' });

    const selected = await materializeSharedPhoto(blob, 'compartida.png', 'image/png');

    expect(selected).toEqual({
      id: 'selected-1',
      file: expect.any(File),
      preview: 'blob:preview',
    });
    expect(selected.file.name).toBe('compartida.png');
    expect(selected.file.type).toBe('image/png');
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
  });

  it('decodes a HEIC file to JPEG before creating its preview blob URL', async () => {
    const original = new File(['heic-bytes'], 'foto.heic', { type: 'image/heic' });
    const jpegBlob = new Blob(['jpeg-bytes'], { type: 'image/jpeg' });
    vi.mocked(isHeic).mockResolvedValue(true);
    vi.mocked(heicTo).mockResolvedValue(jpegBlob);

    const selected = await materializeSelectedPhoto(original);

    expect(heicTo).toHaveBeenCalledWith({ blob: selected?.file, type: 'image/jpeg', quality: 0.9 });
    expect(URL.createObjectURL).toHaveBeenCalledWith(jpegBlob);
    // The uploaded payload itself stays untouched — only the local preview is re-encoded.
    expect(selected?.file.type).toBe('image/heic');
  });

  it('does not attempt HEIC decoding for a non-HEIC file', async () => {
    const original = new File(['image-bytes'], 'foto.jpg', { type: 'image/jpeg' });

    await materializeSelectedPhoto(original);

    expect(heicTo).not.toHaveBeenCalled();
  });

  it('falls back to the raw blob preview when HEIC decoding fails', async () => {
    const original = new File(['heic-bytes'], 'foto.heic', { type: 'image/heic' });
    vi.mocked(isHeic).mockResolvedValue(true);
    const decodeError = new Error('unsupported HEIC variant');
    vi.mocked(heicTo).mockRejectedValue(decodeError);

    const selected = await materializeSelectedPhoto(original);

    expect(URL.createObjectURL).toHaveBeenCalledWith(selected?.file);
    expect(Sentry.captureException).toHaveBeenCalledWith(decodeError, {
      tags: { phase: 'heic-preview-decode' },
      extra: { name: 'foto.heic', size: expect.any(Number), type: 'image/heic' },
    });
  });

  it('resolves real-chapter route context in one operation', () => {
    const chapter = {
      id: 'chapter-1',
      name: 'Verano',
      photoCount: 2,
      lastUpdated: '',
      recuerdoCount: 0,
      undatedPhotoCount: 0,
    };

    expect(resolvePhotoRouteContext({
      baulId: 'baul-1',
      chapterId: 'chapter-1',
      chapters: [chapter],
      loosePhotos: [],
    })).toEqual({
      currentChapter: chapter,
      basePath: '/baules/baul-1/capitulos/chapter-1',
      destination: { type: 'existing', chapterId: 'chapter-1' },
      apiChapterId: 'chapter-1',
    });
  });

  it('resolves loose-photos route context including the virtual chapter', () => {
    const context = resolvePhotoRouteContext({
      baulId: 'baul-1',
      chapterId: undefined,
      chapters: [],
      loosePhotos: [{ id: 'photo-1', thumbnailUrl: 'thumb-1', fullUrl: 'full-1', recuerdoCount: 0 }],
    });

    expect(context).toMatchObject({
      basePath: '/baules/baul-1/fotos-sueltas',
      destination: { type: 'none' },
      apiChapterId: null,
      currentChapter: {
        id: 'sueltas',
        name: 'Fotos sueltas',
        photoCount: 1,
        coverPhotoUrl: 'thumb-1',
        lastUpdated: '',
        recuerdoCount: 0,
        undatedPhotoCount: 1,
      },
    });
  });

  it('converts selected photos to store upload items with the optional upload date', () => {
    const file = new File(['image-bytes'], 'foto.jpg', { type: 'image/jpeg' });
    const selectedPhotos = [{ id: 'selected-1', file, preview: 'blob:preview' }];

    expect(uploadItemsFromSelectedPhotos(selectedPhotos, { year: 1991, month: 8 })).toEqual([
      { clientUploadId: 'selected-1', file, date: { year: 1991, month: 8 } },
    ]);
    expect(uploadItemsFromSelectedPhotos(selectedPhotos, null)).toEqual([
      { clientUploadId: 'selected-1', file, date: undefined },
    ]);
  });
});
