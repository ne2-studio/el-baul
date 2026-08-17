// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { API_BASE, API_CONNECTIVITY_LOST_EVENT, API_FORBIDDEN_EVENT, API_UNAUTHORIZED_EVENT, ApiConnectionError, ApiError, api } from '@/api';

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

  it('normalizes fetch connectivity failures and emits a connectivity lost event once retries on get are exhausted', async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    const onConnectivityLost = vi.fn();
    window.addEventListener(API_CONNECTIVITY_LOST_EVENT, onConnectivityLost);

    const pending = expect(api.baules.getAll()).rejects.toBeInstanceOf(ApiConnectionError);
    await vi.runAllTimersAsync();
    await pending;

    expect(onConnectivityLost).toHaveBeenCalledOnce();
    window.removeEventListener(API_CONNECTIVITY_LOST_EVENT, onConnectivityLost);
  });

  // Regresión issue #38: "Pantalla de 'Sin conexión' salta demasiado a menudo" — un blip de red
  // que se resuelve solo (fallo puntual de SW/CORS, cambio breve de red móvil) no debe mostrar
  // el splash de conectividad. get() reintenta hasta 3 veces (500ms/1s/2s de espera) antes de
  // rendirse, así que una petición que falla una sola vez y luego se resuelve nunca llega a
  // emitir el evento.
  it('retries a transient get failure with backoff and resolves without emitting connectivity lost', async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(
        new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } })
      );
    const onConnectivityLost = vi.fn();
    window.addEventListener(API_CONNECTIVITY_LOST_EVENT, onConnectivityLost);

    const pending = api.baules.getAll();
    await vi.runAllTimersAsync();
    await expect(pending).resolves.toEqual([]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onConnectivityLost).not.toHaveBeenCalled();
    window.removeEventListener(API_CONNECTIVITY_LOST_EVENT, onConnectivityLost);
  });

  it('does not retry a transient post failure and emits connectivity lost on the first failure', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    const onConnectivityLost = vi.fn();
    window.addEventListener(API_CONNECTIVITY_LOST_EVENT, onConnectivityLost);

    await expect(api.baules.create('Familia', 'Fotos')).rejects.toBeInstanceOf(ApiConnectionError);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onConnectivityLost).toHaveBeenCalledOnce();
    window.removeEventListener(API_CONNECTIVITY_LOST_EVENT, onConnectivityLost);
  });

  it('does not treat an aborted request as a connectivity loss', async () => {
    const abortError = new DOMException('The operation was aborted', 'AbortError');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(abortError);
    const onConnectivityLost = vi.fn();
    window.addEventListener(API_CONNECTIVITY_LOST_EVENT, onConnectivityLost);

    await expect(api.baules.getAll()).rejects.toBe(abortError);

    expect(onConnectivityLost).not.toHaveBeenCalled();
    window.removeEventListener(API_CONNECTIVITY_LOST_EVENT, onConnectivityLost);
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
