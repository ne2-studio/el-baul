// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  materializeSelectedPhoto,
  materializeSharedPhoto,
  resolvePhotoRouteContext,
  uploadItemsFromSelectedPhotos,
  uploadResultMessage,
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
const originalRevokeObjectURL = URL.revokeObjectURL;
const originalCreateElement = document.createElement.bind(document);
const originalImage = global.Image;

// jsdom never actually decodes image bytes, so `new Image()` never fires a real `load`/`error`
// event on its own (see usePhotoAspectRatio.test.ts for the same stand-in) — this fires one
// synchronously on assigning `src`, keyed by src, so downscaleForPreview's image-loading step
// can be driven deterministically without a real image-decoding stack.
class FakeImage {
  naturalWidth = 0;
  naturalHeight = 0;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  #src = '';

  set src(value: string) {
    this.#src = value;
    const dims = FakeImage.dimensionsBySrc[value];
    if (dims) {
      this.naturalWidth = dims.width;
      this.naturalHeight = dims.height;
      this.onload?.();
    } else {
      this.onerror?.();
    }
  }

  get src() {
    return this.#src;
  }

  static dimensionsBySrc: Record<string, { width: number; height: number }> = {};
}

// Stands in for the <canvas> downscaleForPreview draws into: jsdom's own canvas has no real
// 2D rendering backend, so this fakes just enough of the surface (a 2D context and
// `toBlob`) to prove downscaleForPreview asks it to draw at the downscaled size and use its
// output as the preview.
function createFakeCanvas(thumbnailBlob: Blob) {
  const drawImage = vi.fn();
  return {
    width: 0,
    height: 0,
    getContext: vi.fn(() => ({ drawImage })),
    toBlob: vi.fn((callback: BlobCallback) => callback(thumbnailBlob)),
    drawImage,
  };
}

describe('uploadFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isHeic).mockResolvedValue(false);
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'selected-1') });
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:preview'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
    // @ts-expect-error -- test double, not a full HTMLImageElement
    global.Image = FakeImage;
    FakeImage.dimensionsBySrc = {};
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
    if (originalRevokeObjectURL) {
      Object.defineProperty(URL, 'revokeObjectURL', {
        configurable: true,
        value: originalRevokeObjectURL,
      });
    } else {
      Reflect.deleteProperty(URL, 'revokeObjectURL');
    }
    document.createElement = originalCreateElement;
    global.Image = originalImage;
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

  // Regression coverage for issue #36: UploadConfirmationScreen/UploadingScreen render
  // `preview` for every picked photo at once, so a full-resolution object URL there makes
  // that grid unresponsive. Before the fix, `preview` was always built straight from the
  // original blob; these assert it's built from a downscaled thumbnail instead — without
  // ever touching `file`, which is what actually gets uploaded.
  describe('preview downscaling', () => {
    it('downscales a large image to a capped thumbnail instead of previewing it full-resolution', async () => {
      const original = new File(['big-image-bytes'], 'foto.jpg', { type: 'image/jpeg' });
      const thumbnailBlob = new Blob(['thumb-bytes'], { type: 'image/jpeg' });
      const fakeCanvas = createFakeCanvas(thumbnailBlob);
      vi.spyOn(document, 'createElement').mockImplementation(((tag: string) =>
        tag === 'canvas' ? fakeCanvas : originalCreateElement(tag)) as typeof document.createElement);
      FakeImage.dimensionsBySrc['blob:preview'] = { width: 4000, height: 3000 };

      const selected = await materializeSelectedPhoto(original);

      // Longer side capped at 480px, aspect ratio preserved.
      expect(fakeCanvas.width).toBe(480);
      expect(fakeCanvas.height).toBe(360);
      expect(fakeCanvas.drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 480, 360);
      // The final `preview` object URL — the last createObjectURL call — is built from the
      // downscaled thumbnail, not from the full-resolution `selected.file` that's about to be
      // uploaded (the *first* call, used only to measure/draw the source image). Compared by
      // identity, since two same-shaped Blobs would otherwise look equal to a deep matcher
      // regardless of their actual bytes.
      const createObjectURLCalls = vi.mocked(URL.createObjectURL).mock.calls.map(([arg]) => arg);
      expect(createObjectURLCalls[0]).toBe(selected?.file);
      expect(createObjectURLCalls.at(-1)).toBe(thumbnailBlob);
      // The intermediate object URL used only to measure/draw the source image is released.
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
    });

    it('does not downscale an image already within the preview size cap', async () => {
      const original = new File(['small-image-bytes'], 'foto.jpg', { type: 'image/jpeg' });
      const createElementSpy = vi.spyOn(document, 'createElement');
      FakeImage.dimensionsBySrc['blob:preview'] = { width: 300, height: 200 };

      const selected = await materializeSelectedPhoto(original);

      expect(createElementSpy).not.toHaveBeenCalledWith('canvas');
      expect(URL.createObjectURL).toHaveBeenCalledWith(selected?.file);
    });

    it('falls back to the un-downscaled source and reports to Sentry when the image fails to load', async () => {
      const original = new File(['broken-bytes'], 'foto.jpg', { type: 'image/jpeg' });
      // No dims registered for 'blob:preview' — FakeImage fires onerror.

      const selected = await materializeSelectedPhoto(original);

      expect(URL.createObjectURL).toHaveBeenCalledWith(selected?.file);
      expect(Sentry.captureException).toHaveBeenCalledWith(expect.any(Error), {
        tags: { phase: 'preview-downscale' },
        extra: { name: 'foto.jpg', size: expect.any(Number), type: 'image/jpeg' },
      });
    });
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

  it('decodes a HEIC file straight to a downscaled bitmap preview', async () => {
    const original = new File(['heic-bytes'], 'foto.heic', { type: 'image/heic' });
    const thumbnailBlob = new Blob(['jpeg-bytes'], { type: 'image/jpeg' });
    const fakeCanvas = createFakeCanvas(thumbnailBlob);
    vi.spyOn(document, 'createElement').mockImplementation(((tag: string) =>
      tag === 'canvas' ? fakeCanvas : originalCreateElement(tag)) as typeof document.createElement);
    const bitmapClose = vi.fn();
    const fakeBitmap = { width: 4000, height: 3000, close: bitmapClose } as unknown as ImageBitmap;
    // The downscaled thumbnail is measured a second time by downscaleForPreview's <img>-based
    // path (which every preview source, HEIC-decoded or not, flows through) — already at the
    // preview cap, so that pass is a no-op and re-uses the same object URL stub.
    FakeImage.dimensionsBySrc['blob:preview'] = { width: 480, height: 360 };
    vi.mocked(isHeic).mockResolvedValue(true);
    // `heicTo`'s overloaded signature makes `mockResolvedValue` pick the Blob-returning
    // overload; `mockImplementation` sidesteps that ambiguity.
    vi.mocked(heicTo).mockImplementation((async () => fakeBitmap) as unknown as typeof heicTo);

    const selected = await materializeSelectedPhoto(original);

    // Decoded straight to a bitmap (no intermediate full-resolution JPEG) and downscaled in a
    // single canvas pass — longer side capped at 480px, aspect ratio preserved.
    expect(heicTo).toHaveBeenCalledWith({ blob: selected?.file, type: 'bitmap' });
    expect(fakeCanvas.width).toBe(480);
    expect(fakeCanvas.height).toBe(360);
    expect(fakeCanvas.drawImage).toHaveBeenCalledWith(fakeBitmap, 0, 0, 480, 360);
    expect(bitmapClose).toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalledWith(thumbnailBlob);
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
      loosePhotos: [{ id: 'photo-1', thumbnailUrl: 'thumb-1', fullUrl: 'full-1', recuerdoCount: 0, canDelete: false, canRequestRemoval: true }],
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

  it('converts selected photos to store upload items', () => {
    const file = new File(['image-bytes'], 'foto.jpg', { type: 'image/jpeg' });
    const selectedPhotos = [{ id: 'selected-1', file, preview: 'blob:preview' }];

    expect(uploadItemsFromSelectedPhotos(selectedPhotos)).toEqual([
      { clientUploadId: 'selected-1', uploadBatchId: expect.any(String), file },
    ]);
  });

  // Regression coverage for the baúl feed's "upload batch" cards (see
  // IPhotoUploadBatchReadModel on the backend): every photo picked in the same upload action
  // must share one uploadBatchId, but two separate actions must not collide. The beforeEach
  // stub above pins crypto.randomUUID to a single constant (so SelectedPhoto ids stay
  // deterministic elsewhere), so this test drives it explicitly instead.
  it('shares one uploadBatchId across every item from the same call, and a fresh one per call', () => {
    const file = new File(['image-bytes'], 'foto.jpg', { type: 'image/jpeg' });
    const selectedPhotos = [
      { id: 'selected-1', file, preview: 'blob:preview-1' },
      { id: 'selected-2', file, preview: 'blob:preview-2' },
    ];

    const batch1 = '11111111-1111-1111-1111-111111111111';
    const batch2 = '22222222-2222-2222-2222-222222222222';

    vi.mocked(crypto.randomUUID).mockReturnValueOnce(batch1);
    const [first, second] = uploadItemsFromSelectedPhotos(selectedPhotos);
    expect(first.uploadBatchId).toBe(batch1);
    expect(second.uploadBatchId).toBe(batch1);

    vi.mocked(crypto.randomUUID).mockReturnValueOnce(batch2);
    const [third] = uploadItemsFromSelectedPhotos(selectedPhotos);
    expect(third.uploadBatchId).toBe(batch2);
  });

  describe('uploadResultMessage', () => {
    it('reports a single newly-uploaded photo the same way as before this feature existed', () => {
      expect(uploadResultMessage(1, 0)).toBe('Tu recuerdo ya está a salvo');
    });

    it('reports several newly-uploaded photos the same way as before this feature existed', () => {
      expect(uploadResultMessage(3, 0)).toBe('Tus 3 recuerdos ya están a salvo');
    });

    it('reports a single already-existing photo without any error/duplicate wording', () => {
      expect(uploadResultMessage(0, 1)).toBe('Esta foto ya estaba en el baúl');
    });

    it('reports several already-existing photos, plural', () => {
      expect(uploadResultMessage(0, 3)).toBe('Estas fotos ya estaban en el baúl');
    });

    it('reports a mixed batch distinguishing uploaded from already-existing counts', () => {
      expect(uploadResultMessage(17, 3)).toBe('17 fotos subidas · 3 ya estaban en el baúl');
    });

    it('uses singular wording for a mixed batch of exactly one of each', () => {
      expect(uploadResultMessage(1, 1)).toBe('1 foto subida · 1 ya estaba en el baúl');
    });
  });
});
