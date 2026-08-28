import { useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { usePostHog } from 'posthog-js/react';
import { Icon } from '@/design-system/foundations/icons/Icon';
import { icons } from '@/design-system/foundations/icons/icons';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useAuthStore } from '@/store/useAuthStore';
import { enablePushNotifications } from '@/features/profile/useCases';
import { isPushNotificationsSupported, PushPermissionDeniedError } from './pushNotifications';
import { dismissPushNotificationsBanner, isPushNotificationsBannerDismissed } from './pushNotificationsBannerUtils';

// Calculado una sola vez al cargar el módulo, mismo motivo que AndroidAppBanner: la plataforma
// de Capacitor no cambia durante la vida de la pestaña.
const IS_PUSH_NOTIFICATIONS_SUPPORTED = isPushNotificationsSupported();

// Overlay global (montado una vez en App.tsx, junto a AndroidAppBanner) que anima a activar las
// notificaciones push nativas. Mismo diseño que AndroidAppBanner a propósito — ver issue #23:
// "similar al actual que sirve para descargar la app". Solo tiene sentido dentro de la propia
// app nativa de Android (nunca en la webapp: los dos banners son mutuamente excluyentes por
// plataforma, ver isPushNotificationsSupported/isAndroidWebBrowser) y solo mientras este
// dispositivo no tenga ya las notificaciones activadas — misma condición que showPushToggle en
// NotificationPreferencesRoute. Ver pushNotificationsBannerUtils.ts para el cooldown de cierre.
export function PushNotificationsBanner() {
  const auth = useAuth();
  const posthog = usePostHog();
  const pushNotificationsEnabled = useAuthStore((state) => state.pushNotificationsEnabled);
  const { run, isPending } = useAsyncAction();
  const [dismissed, setDismissed] = useState(() => isPushNotificationsBannerDismissed());

  const shouldShow =
    auth.isAuthenticated && IS_PUSH_NOTIFICATIONS_SUPPORTED && !pushNotificationsEnabled && !dismissed;

  if (!shouldShow) return null;

  const handleDismiss = () => {
    dismissPushNotificationsBanner();
    posthog.capture('push_notifications_banner_dismissed');
    setDismissed(true);
  };

  const handleEnable = () => {
    void run(() => enablePushNotifications(), {
      // Sin successMessage: al conceder el permiso, pushNotificationsEnabled pasa a true y el
      // propio banner desaparece — ya es feedback suficiente, un toast adicional sería ruido.
      errorMessage: (error) =>
        error instanceof PushPermissionDeniedError
          ? 'Activa los permisos de notificaciones desde los ajustes del sistema.'
          : 'No se pudieron activar las notificaciones push.',
    }).then((result) => {
      if (result.ok) posthog.capture('push_notifications_enabled');
    });
  };

  return (
    <div className="fixed top-[calc(0.75rem_+_var(--safe-top))] left-4 right-4 md:left-1/2 md:right-auto md:w-96 md:-translate-x-1/2 z-40 animate-slide-down">
      <div className="bg-card border border-border rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
          <Icon icon={icons.bell} size="md" className="text-primary" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-foreground font-medium text-sm">Activa las notificaciones</p>
          <p className="text-muted-foreground text-xs">Entérate cuando haya novedades en tus baúles</p>
        </div>
        <button
          type="button"
          onClick={handleEnable}
          disabled={isPending()}
          className="shrink-0 bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          Activar
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Cerrar"
          className="shrink-0 text-muted-foreground hover:text-foreground p-1"
        >
          <Icon icon={icons.close} size="sm" aria-hidden />
        </button>
      </div>
    </div>
  );
}
