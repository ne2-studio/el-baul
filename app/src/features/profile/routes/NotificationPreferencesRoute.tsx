import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { NotificationPreferencesScreen } from '@/features/profile/components/NotificationPreferencesScreen';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useAuthStore } from '@/store/useAuthStore';
import { loadNotificationPreferences, updateNotificationPreferences, enablePushNotifications, disablePushNotifications } from '@/features/profile/useCases';
import { isPushNotificationsSupported, PushPermissionDeniedError } from '@/features/profile/native/pushNotifications';
import { usePostHog } from 'posthog-js/react';

export const NotificationPreferencesRoute: React.FC = () => {
  const navigate = useNavigate();
  const { run, isPending } = useAsyncAction();
  const { run: runPush, isPending: isPushPending } = useAsyncAction();
  const { weeklyDigestEnabled, pushNotificationsEnabled } = useAuthStore();
  const posthog = usePostHog();

  useEffect(() => {
    // No-ops if the session-level bootstrap (features/auth/useCases) has already populated
    // this — see loadNotificationPreferences.
    run(() => loadNotificationPreferences(), { errorMessage: 'No se pudieron cargar tus preferencias.' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggle = async () => {
    if (weeklyDigestEnabled === null) return;
    const next = !weeklyDigestEnabled;
    const result = await run(() => updateNotificationPreferences(next), {
      successMessage: next ? 'Resumen semanal activado' : 'Resumen semanal desactivado',
      errorMessage: 'No se pudo actualizar la preferencia.',
    });
    if (result.ok) posthog.capture('notification_preferences_updated', { weekly_digest_enabled: next });
  };

  const handleTogglePush = async () => {
    if (pushNotificationsEnabled) {
      const result = await runPush(() => disablePushNotifications(), {
        successMessage: 'Notificaciones push desactivadas',
        errorMessage: 'No se pudieron desactivar las notificaciones push.',
      });
      if (result.ok) posthog.capture('push_notifications_disabled');
      return;
    }

    const result = await runPush(() => enablePushNotifications(), {
      successMessage: 'Notificaciones push activadas',
      errorMessage: (error) =>
        error instanceof PushPermissionDeniedError
          ? 'Activa los permisos de notificaciones desde los ajustes del sistema.'
          : 'No se pudieron activar las notificaciones push.',
    });
    if (result.ok) posthog.capture('push_notifications_enabled');
  };

  if (weeklyDigestEnabled === null) return null;

  return (
    <NotificationPreferencesScreen
      onBack={() => navigate('/cuenta')}
      weeklyDigestEnabled={weeklyDigestEnabled}
      onToggle={handleToggle}
      isSaving={isPending()}
      showPushToggle={isPushNotificationsSupported()}
      pushNotificationsEnabled={pushNotificationsEnabled}
      onTogglePush={handleTogglePush}
      isPushSaving={isPushPending()}
    />
  );
};
