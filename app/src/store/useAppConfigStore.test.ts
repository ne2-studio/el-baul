// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api', () => ({
  api: {
    appConfig: {
      get: vi.fn(),
    },
  },
}));

import { api } from '@/api';
import { useAppConfigStore } from './useAppConfigStore';

describe('useAppConfigStore.fetchAppConfig maintenanceModeEnabled', () => {
  beforeEach(() => {
    useAppConfigStore.setState({ maintenanceModeEnabled: false });
    vi.clearAllMocks();
  });

  it('sets maintenanceModeEnabled to true when the backend reports maintenance mode on', async () => {
    vi.mocked(api.appConfig.get).mockResolvedValue({
      features: { maintenanceModeEnabled: true },
    } as Awaited<ReturnType<typeof api.appConfig.get>>);

    await useAppConfigStore.getState().fetchAppConfig();

    expect(useAppConfigStore.getState().maintenanceModeEnabled).toBe(true);
  });

  it('defaults maintenanceModeEnabled to false when the backend omits it', async () => {
    useAppConfigStore.setState({ maintenanceModeEnabled: true });
    vi.mocked(api.appConfig.get).mockResolvedValue({
      features: {},
    } as Awaited<ReturnType<typeof api.appConfig.get>>);

    await useAppConfigStore.getState().fetchAppConfig();

    expect(useAppConfigStore.getState().maintenanceModeEnabled).toBe(false);
  });
});
