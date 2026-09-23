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

describe('useAppConfigStore.fetchAppConfig biografiaEnabled', () => {
  beforeEach(() => {
    useAppConfigStore.setState({ biografiaEnabled: false });
    vi.clearAllMocks();
  });

  it('sets biografiaEnabled to true when the backend reports the feature on', async () => {
    vi.mocked(api.appConfig.get).mockResolvedValue({
      features: { biografiaEnabled: true },
    } as Awaited<ReturnType<typeof api.appConfig.get>>);

    await useAppConfigStore.getState().fetchAppConfig();

    expect(useAppConfigStore.getState().biografiaEnabled).toBe(true);
  });

  it('defaults biografiaEnabled to false when the backend omits it', async () => {
    useAppConfigStore.setState({ biografiaEnabled: true });
    vi.mocked(api.appConfig.get).mockResolvedValue({
      features: {},
    } as Awaited<ReturnType<typeof api.appConfig.get>>);

    await useAppConfigStore.getState().fetchAppConfig();

    expect(useAppConfigStore.getState().biografiaEnabled).toBe(false);
  });
});

describe('useAppConfigStore.fetchAppConfig devicePhotosEnabled (docs/.backlog issue #83)', () => {
  beforeEach(() => {
    useAppConfigStore.setState({ devicePhotosEnabled: true });
    vi.clearAllMocks();
  });

  it('sets devicePhotosEnabled to false when the backend reports the ops kill switch off', async () => {
    vi.mocked(api.appConfig.get).mockResolvedValue({
      features: { devicePhotosEnabled: false },
    } as Awaited<ReturnType<typeof api.appConfig.get>>);

    await useAppConfigStore.getState().fetchAppConfig();

    expect(useAppConfigStore.getState().devicePhotosEnabled).toBe(false);
  });

  it('defaults devicePhotosEnabled to true (opt-out, not opt-in) when the backend omits it', async () => {
    useAppConfigStore.setState({ devicePhotosEnabled: false });
    vi.mocked(api.appConfig.get).mockResolvedValue({
      features: {},
    } as Awaited<ReturnType<typeof api.appConfig.get>>);

    await useAppConfigStore.getState().fetchAppConfig();

    expect(useAppConfigStore.getState().devicePhotosEnabled).toBe(true);
  });
});
