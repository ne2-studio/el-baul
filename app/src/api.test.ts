// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { API_BASE, API_FORBIDDEN_EVENT, API_UNAUTHORIZED_EVENT, ApiError, api } from '@/api';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('api error handling', () => {
  it('preserves status and emits a forbidden event for 403 responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'No puedes entrar' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const onForbidden = vi.fn();
    window.addEventListener(API_FORBIDDEN_EVENT, onForbidden);

    await expect(api.baules.getAll()).rejects.toMatchObject({
      name: 'ApiError',
      status: 403,
      message: 'No puedes entrar',
    } satisfies Partial<ApiError>);

    expect(onForbidden).toHaveBeenCalledOnce();
    window.removeEventListener(API_FORBIDDEN_EVENT, onForbidden);
  });

  it('preserves status and emits an unauthorized event for 401 responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Sesión caducada' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const onUnauthorized = vi.fn();
    window.addEventListener(API_UNAUTHORIZED_EVENT, onUnauthorized);

    await expect(api.baules.getAll()).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      message: 'Sesión caducada',
    } satisfies Partial<ApiError>);

    expect(onUnauthorized).toHaveBeenCalledOnce();
    window.removeEventListener(API_UNAUTHORIZED_EVENT, onUnauthorized);
  });
});

describe('api adapters', () => {
  it('keeps JSON route and body construction local to the baules adapter', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({
      id: 'baul-1',
      name: 'Familia',
      description: 'Fotos',
      chapterCount: 0,
      coverPhotoUrl: null,
      updatedAt: '2026-01-01T00:00:00Z',
      role: 'administrador',
      isCustodio: true,
      memberCount: 1,
    }));

    await api.baules.create('Familia', 'Fotos');

    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE}/api/baules`, expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ name: 'Familia', description: 'Fotos' }),
    }));
  });

  it('builds multipart photo uploads without JSON content-type', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(photoDto()));
    const file = new File(['img'], 'foto.jpg', { type: 'image/jpeg' });

    await api.photos.upload('baul-1', null, file, 'upload-1', { year: 1999, month: 5 }, 'batch-1');

    const [, init] = fetchMock.mock.calls[0];
    expect(fetchMock.mock.calls[0][0]).toBe(`${API_BASE}/api/baules/baul-1/photos/sueltas`);
    expect(init).toMatchObject({ method: 'POST', headers: {} });
    expect(init?.body).toBeInstanceOf(FormData);
    const formData = init?.body as FormData;
    expect(formData.get('file')).toBe(file);
    expect(formData.get('clientUploadId')).toBe('upload-1');
    expect(formData.get('uploadBatchId')).toBe('batch-1');
    expect(formData.get('dateYear')).toBe('1999');
    expect(formData.get('dateMonth')).toBe('5');
  });

  it('returns binary downloads with decoded filename', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('jpg', {
      status: 200,
      headers: { 'Content-Disposition': 'attachment; filename="foto%201.jpg"' },
    }));

    const result = await api.photos.download('photo-1');

    expect(result.fileName).toBe('foto 1.jpg');
    expect(await result.blob.text()).toBe('jpg');
  });

  it('keeps anonymous invite preview on the generated invite path', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({
      baulId: 'baul-1',
      name: 'Familia',
      description: null,
      previewPhotos: [],
      coverPhotoUrl: null,
      personaAvatarUrls: [],
    }));

    await api.baulInvites.getPreview('token/con espacios');

    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE}/api/baul-invites/token%2Fcon%20espacios/preview`, {
      headers: {},
    });
  });

  it('submits support requests through the support adapter', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ success: true }));

    await api.support.submit('Bug', 'Algo falla');

    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE}/api/support`, expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ category: 'Bug', message: 'Algo falla' }),
    }));
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function photoDto() {
  return {
    id: 'photo-1',
    thumbnailUrl: '/thumb.jpg',
    fullUrl: '/full.jpg',
    dateYear: null,
    dateMonth: null,
    dateDay: null,
    recuerdoCount: 0,
    chapterId: null,
  };
}
