import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: vi.fn(() => true) },
}));

vi.mock('@capacitor/app', () => ({
  App: { getInfo: vi.fn() },
}));

import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { getAppVersion } from './appVersion';

describe('getAppVersion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the native version and build number on a native platform', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(CapacitorApp.getInfo).mockResolvedValue({
      version: '1.2.3',
      build: '45',
      name: 'El Baúl',
      id: 'studio.ne2.elbaul',
    });

    await expect(getAppVersion()).resolves.toBe('1.2.3 (45)');
  });

  it('returns "web" off native platforms, without calling the native plugin', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);

    await expect(getAppVersion()).resolves.toBe('web');
    expect(CapacitorApp.getInfo).not.toHaveBeenCalled();
  });
});
