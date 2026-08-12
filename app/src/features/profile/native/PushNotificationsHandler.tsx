import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { PushNotifications } from '@capacitor/push-notifications';
import { isPushNotificationsSupported } from '@/features/profile/native/pushNotifications';
import { ENTRY_SOURCE_PARAM } from '@/utils/entrySource';

// Mounted once inside <BrowserRouter> (needs useNavigate), same shape as NativeShareHandler.
// Handles tapping a delivered push notification: if the admin included a deep link when
// sending it (see AdminController's push-notifications/test endpoint), navigate there.
export function PushNotificationsHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isPushNotificationsSupported()) return;

    const listenerPromise = PushNotifications.addListener('pushNotificationActionPerformed', (event) => {
      const deepLink = event.notification.data?.deepLink;
      if (typeof deepLink === 'string' && deepLink) {
        // Marca la navegación como venida de push (ver utils/entrySource) — BaulRoute la usa
        // para no proponer la recomendación de contribución justo al entrar por notificación.
        const separator = deepLink.includes('?') ? '&' : '?';
        navigate(`${deepLink}${separator}${ENTRY_SOURCE_PARAM}=push`);
      }
    });

    return () => {
      void listenerPromise.then((handle) => handle.remove()).catch((error) => Sentry.captureException(error));
    };
  }, [navigate]);

  return null;
}
