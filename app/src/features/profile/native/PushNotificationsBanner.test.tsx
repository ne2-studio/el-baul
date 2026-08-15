// @vitest-environment jsdom
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from 'react-oidc-context';
import { PushNotificationsBanner } from './PushNotificationsBanner';
import { useAuthStore } from '@/store/useAuthStore';
import { enablePushNotifications } from '@/features/profile/useCases';
import { useUIStore } from '@/store/uiStore';
import { PushPermissionDeniedError } from './pushNotifications';
import { dismissPushNotificationsBanner } from './pushNotificationsBannerUtils';

vi.mock('react-oidc-context', () => ({
  useAuth: vi.fn(() => ({ isAuthenticated: true })),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: vi.fn(() => true), getPlatform: vi.fn(() => 'android') },
}));

vi.mock('@/features/profile/useCases', () => ({
  enablePushNotifications: vi.fn(),
}));

describe('PushNotificationsBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as ReturnType<typeof useAuth>);
    useAuthStore.setState({ pushNotificationsEnabled: false });
  });

  it('shows the banner when native, unauthenticated push, and not dismissed', () => {
    render(<PushNotificationsBanner />);

    expect(screen.getByText('Activa las notificaciones')).toBeInTheDocument();
  });

  it('does not show when the device already has push notifications enabled', () => {
    useAuthStore.setState({ pushNotificationsEnabled: true });

    render(<PushNotificationsBanner />);

    expect(screen.queryByText('Activa las notificaciones')).not.toBeInTheDocument();
  });

  it('does not show when not authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false } as ReturnType<typeof useAuth>);

    render(<PushNotificationsBanner />);

    expect(screen.queryByText('Activa las notificaciones')).not.toBeInTheDocument();
  });

  it('does not show when it was dismissed within the cooldown', () => {
    dismissPushNotificationsBanner();

    render(<PushNotificationsBanner />);

    expect(screen.queryByText('Activa las notificaciones')).not.toBeInTheDocument();
  });

  it('shows again once the cooldown has expired', () => {
    dismissPushNotificationsBanner(Date.now() - 8 * 24 * 60 * 60 * 1000);

    render(<PushNotificationsBanner />);

    expect(screen.getByText('Activa las notificaciones')).toBeInTheDocument();
  });

  it('hides after dismissing and stores the cooldown', () => {
    render(<PushNotificationsBanner />);

    act(() => screen.getByLabelText('Cerrar').click());

    expect(screen.queryByText('Activa las notificaciones')).not.toBeInTheDocument();
    expect(localStorage.getItem('elbaul.pushNotificationsBannerDismissedAt')).not.toBeNull();
  });

  it('requests push notifications when "Activar" is tapped', async () => {
    vi.mocked(enablePushNotifications).mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<PushNotificationsBanner />);
    await user.click(screen.getByText('Activar'));

    expect(enablePushNotifications).toHaveBeenCalled();
  });

  it('shows an error toast when the permission is denied, without dismissing the banner', async () => {
    vi.mocked(enablePushNotifications).mockRejectedValue(new PushPermissionDeniedError());
    const user = userEvent.setup();

    render(<PushNotificationsBanner />);
    await user.click(screen.getByText('Activar'));

    await waitFor(() =>
      expect(useUIStore.getState().toastMessage).toBe(
        'Activa los permisos de notificaciones desde los ajustes del sistema.'
      )
    );
    expect(screen.getByText('Activa las notificaciones')).toBeInTheDocument();
  });
});
