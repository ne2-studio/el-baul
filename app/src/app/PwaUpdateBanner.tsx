import { Icon } from '@/design-system/foundations/icons/Icon';
import { icons } from '@/design-system/foundations/icons/icons';
import { usePwaUpdateStore } from '@/store/usePwaUpdateStore';

// Overlay global (montado una vez en App.tsx, junto a AndroidAppBanner/PushNotificationsBanner)
// que sustituye el auto-reload silencioso que causaba el issue #34: "la app se refresca sola y
// me cambia la recomendación". main.tsx registra el service worker con registerType: 'prompt'
// (ver vite.config.ts) en vez de 'autoUpdate', así que una versión nueva ya descargada se queda
// en espera hasta que la persona confirma aquí — solo entonces se activa y recarga la página.
// Deliberadamente sin botón de cerrar (a diferencia de AndroidAppBanner/PushNotificationsBanner):
// la versión vieja sigue funcionando mientras tanto, pero no tiene sentido ofrecer posponerlo
// indefinidamente — es un aviso, no una elección real.
export function PwaUpdateBanner() {
  const updateAvailable = usePwaUpdateStore((state) => state.updateAvailable);
  const applyUpdate = usePwaUpdateStore((state) => state.applyUpdate);

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-[calc(1.5rem_+_var(--safe-bottom))] left-4 right-4 md:left-1/2 md:right-auto md:w-96 md:-translate-x-1/2 z-50 animate-slide-up">
      <button
        type="button"
        onClick={applyUpdate}
        className="w-full text-left bg-card border border-border rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3 hover:opacity-90 transition-opacity"
      >
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
          <Icon icon={icons.refresh} size="md" className="text-primary" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-foreground font-medium text-sm">Hay una versión nueva disponible</p>
          <p className="text-muted-foreground text-xs">Toca para actualizar</p>
        </div>
      </button>
    </div>
  );
}
