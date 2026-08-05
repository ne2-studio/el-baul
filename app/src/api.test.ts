// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { API_FORBIDDEN_EVENT, API_UNAUTHORIZED_EVENT, ApiError, api } from '@/api';

describe('api error handling', () => {
  it('preserves status and emits a forbidden event for 403 responses', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
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
    fetchMock.mockRestore();
  });

  it('preserves status and emits an unauthorized event for 401 responses', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
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
    fetchMock.mockRestore();
  });
});
