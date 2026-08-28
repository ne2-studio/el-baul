// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api', () => ({
  api: { analytics: { reportSessionOpen: vi.fn().mockResolvedValue(undefined) } },
}));
vi.mock('@/utils/platform', () => ({ getClientPlatform: vi.fn(() => 'desktop_browser') }));

import { api } from '@/api';
import { reportSessionOpen } from './sessionAnalytics';

describe('reportSessionOpen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('reports the session on the first call', async () => {
    await reportSessionOpen(10_000_000_000);

    expect(api.analytics.reportSessionOpen).toHaveBeenCalledWith('desktop_browser', 'direct');
  });

  it('reports the entry source from the current URL', async () => {
    window.history.pushState({}, '', '/invitacion/baul/tok/aceptar?entry=link');

    await reportSessionOpen(10_000_000_000);

    expect(api.analytics.reportSessionOpen).toHaveBeenCalledWith('desktop_browser', 'link');
  });

  it('does not report again within 30 minutes of the last report', async () => {
    const now = 10_000_000_000;
    await reportSessionOpen(now);
    vi.mocked(api.analytics.reportSessionOpen).mockClear();

    await reportSessionOpen(now + 29 * 60 * 1000);

    expect(api.analytics.reportSessionOpen).not.toHaveBeenCalled();
  });

  it('reports again once 30 minutes have passed since the last report', async () => {
    const now = 10_000_000_000;
    await reportSessionOpen(now);
    vi.mocked(api.analytics.reportSessionOpen).mockClear();

    await reportSessionOpen(now + 30 * 60 * 1000);

    expect(api.analytics.reportSessionOpen).toHaveBeenCalledTimes(1);
  });

  it('fails open when the request rejects, without throwing', async () => {
    vi.mocked(api.analytics.reportSessionOpen).mockRejectedValueOnce(new Error('network down'));

    await expect(reportSessionOpen(10_000_000_000)).resolves.toBeUndefined();
  });

  it('does not persist the throttle timestamp when the request fails', async () => {
    vi.mocked(api.analytics.reportSessionOpen).mockRejectedValueOnce(new Error('network down'));
    const now = 10_000_000_000;
    await reportSessionOpen(now);
    vi.mocked(api.analytics.reportSessionOpen).mockClear();

    await reportSessionOpen(now + 1000);

    expect(api.analytics.reportSessionOpen).toHaveBeenCalledTimes(1);
  });
});
