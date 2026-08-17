// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { attemptAutoRelogin, clearAutoReloginAttempt } from './autoRelogin';

describe('attemptAutoRelogin', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('triggers signinRedirect without an account picker, carrying redirectTo as state', async () => {
    const signinRedirect = vi.fn().mockResolvedValue(undefined);

    const retried = await attemptAutoRelogin(signinRedirect, '/baules/baul-1');

    expect(retried).toBe(true);
    expect(signinRedirect).toHaveBeenCalledWith({ state: { redirectTo: '/baules/baul-1' } });
    expect(signinRedirect.mock.calls[0][0]).not.toHaveProperty('prompt');
  });

  it('only retries once per tab session — a second drop falls back without calling signinRedirect again', async () => {
    const signinRedirect = vi.fn().mockResolvedValue(undefined);

    await attemptAutoRelogin(signinRedirect, '/baules/baul-1');
    const secondRetried = await attemptAutoRelogin(signinRedirect, '/baules/baul-1');

    expect(secondRetried).toBe(false);
    expect(signinRedirect).toHaveBeenCalledTimes(1);
  });

  it('allows a fresh retry after clearAutoReloginAttempt (e.g. a subsequent successful login)', async () => {
    const signinRedirect = vi.fn().mockResolvedValue(undefined);

    await attemptAutoRelogin(signinRedirect, '/baules/baul-1');
    clearAutoReloginAttempt();
    const retriedAgain = await attemptAutoRelogin(signinRedirect, '/baules/baul-1');

    expect(retriedAgain).toBe(true);
    expect(signinRedirect).toHaveBeenCalledTimes(2);
  });

  it('falls back to the manual flow when signinRedirect itself fails', async () => {
    const signinRedirect = vi.fn().mockRejectedValue(new Error('network error'));

    const retried = await attemptAutoRelogin(signinRedirect, null);

    expect(retried).toBe(false);
  });
});
