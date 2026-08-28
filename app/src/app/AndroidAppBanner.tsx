import { useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { usePostHog } from 'posthog-js/react';
import { Icon } from '@/design-system/foundations/icons/Icon';
import { icons } from '@/design-system/foundations/icons/icons';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import {
  buildAndroidAppIntentUrl,
  dismissAndroidAppBanner,
  isAndroidAppBannerDismissed,
  isAndroidWebBrowser,
} from './androidAppBannerUtils';

// Calculado una sola vez al cargar el módulo: navigator.userAgent y la plataforma de Capacitor
// no cambian durante la vida de la pestaña, así que no hace falta recomputarlo en cada render.
const IS_ANDROID_WEB_BROWSER = isAndroidWebBrowser();

// Overlay global (montado una vez en App.tsx, junto a Toast/PushNotificationsHandler) que
// ofrece abrir/instalar la app nativa. Solo tiene sentido en la webapp de Android — nunca
// dentro de la propia app nativa (ya instalada) ni en otras plataformas — y solo mientras el
// backend lo tenga activado vía Features:AndroidAppBannerEnabled (ver AppConfigController), de
// ahí que dependa de que useAppConfigStore ya haya cargado la config antes de decidir si se
// muestra. Ver androidAppBanner.ts para el enlace de apertura y el cooldown de cierre.
export function AndroidAppBanner() {
  const auth = useAuth();
  const posthog = usePostHog();
  const androidAppBannerEnabled = useAppConfigStore((state) => state.androidAppBannerEnabled);
  const googlePlayUrl = useAppConfigStore((state) => state.googlePlayUrl);
  const [dismissed, setDismissed] = useState(() => isAndroidAppBannerDismissed());

  const shouldShow =
    auth.isAuthenticated &&
    androidAppBannerEnabled &&
    IS_ANDROID_WEB_BROWSER &&
    // Sin URL de Play Store configurada, el backend no está realmente listo para el rollout
    // aunque el flag esté a true — mejor no mostrar nada que un botón que no lleva a ningún
    // sitio útil.
    googlePlayUrl !== '' &&
    !dismissed;

  if (!shouldShow) return null;

  const handleDismiss = () => {
    dismissAndroidAppBanner();
    posthog.capture('native_app_banner_dismissed');
    setDismissed(true);
  };

  return (
    <div className="fixed top-[calc(0.75rem_+_var(--safe-top))] left-4 right-4 md:left-1/2 md:right-auto md:w-96 md:-translate-x-1/2 z-40 animate-slide-down">
      <div className="bg-card border border-border rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
          <Icon icon={icons.download} size="md" className="text-primary" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-foreground font-medium text-sm">Descarga la app de El Baúl</p>
          <p className="text-muted-foreground text-xs">Más rápida y con notificaciones</p>
        </div>
        <a
          href={buildAndroidAppIntentUrl(googlePlayUrl)}
          onClick={() => posthog.capture('native_app_download_clicked')}
          className="shrink-0 bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Abrir
        </a>
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
