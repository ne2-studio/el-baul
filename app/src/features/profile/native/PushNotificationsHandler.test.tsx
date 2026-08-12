// @vitest-environment jsdom
import { MemoryRouter, useLocation } from 'react-router-dom';
import { act, render, waitFor, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PushNotificationsHandler } from './PushNotificationsHandler';

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: vi.fn(() => true), getPlatform: vi.fn(() => 'android') },
}));

vi.mock('@sentry/react', () => ({
  captureException: vi.fn(),
}));

vi.mock('@capacitor/push-notifications', () => ({
  PushNotifications: { addListener: vi.fn() },
}));

import { Capacitor } from '@capacitor/core';
import { PushNotifications, type ActionPerformed } from '@capacitor/push-notifications';

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}{location.search}</div>;
}

function renderHandler() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <PushNotificationsHandler />
      <LocationDisplay />
    </MemoryRouter>
  );
}

function actionPerformed(data: Record<string, unknown>): ActionPerformed {
  return { actionId: 'tap', notification: { id: '1', data } };
}

describe('PushNotificationsHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
    vi.mocked(PushNotifications.addListener).mockResolvedValue({ remove: vi.fn() });
  });

  it('does nothing on a non-native platform', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);

    renderHandler();

    await act(async () => {
      await Promise.resolve();
    });
    expect(PushNotifications.addListener).not.toHaveBeenCalled();
  });

  it('does nothing on a native platform that is not Android (e.g. iOS)', async () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue('ios');

    renderHandler();

    await act(async () => {
      await Promise.resolve();
    });
    expect(PushNotifications.addListener).not.toHaveBeenCalled();
  });

  it('navigates to the deep link when a notification action is performed, marked as entry=push', async () => {
    let tapCallback: ((event: ActionPerformed) => void) | undefined;
    vi.mocked(PushNotifications.addListener).mockImplementation((_event, callback) => {
      tapCallback = callback as (event: ActionPerformed) => void;
      return Promise.resolve({ remove: vi.fn() });
    });

    renderHandler();
    await waitFor(() => expect(tapCallback).toBeDefined());

    act(() => tapCallback!(actionPerformed({ deepLink: '/baules/abc' })));

    // El ?entry=push es lo que BaulRoute usa (ver utils/entrySource) para no proponer la
    // recomendación de contribución justo al entrar por notificación.
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/baules/abc?entry=push'));
  });

  it('appends entry=push with & when the deep link already carries a query string', async () => {
    let tapCallback: ((event: ActionPerformed) => void) | undefined;
    vi.mocked(PushNotifications.addListener).mockImplementation((_event, callback) => {
      tapCallback = callback as (event: ActionPerformed) => void;
      return Promise.resolve({ remove: vi.fn() });
    });

    renderHandler();
    await waitFor(() => expect(tapCallback).toBeDefined());

    act(() => tapCallback!(actionPerformed({ deepLink: '/baules/abc?activeTab=personas' })));

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/baules/abc?activeTab=personas&entry=push')
    );
  });

  it('does not navigate when the notification has no deep link', async () => {
    let tapCallback: ((event: ActionPerformed) => void) | undefined;
    vi.mocked(PushNotifications.addListener).mockImplementation((_event, callback) => {
      tapCallback = callback as (event: ActionPerformed) => void;
      return Promise.resolve({ remove: vi.fn() });
    });

    renderHandler();
    await waitFor(() => expect(tapCallback).toBeDefined());

    act(() => tapCallback!(actionPerformed({})));
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId('location')).toHaveTextContent('/');
  });
});
