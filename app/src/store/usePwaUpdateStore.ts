import { create } from 'zustand';

interface PwaUpdateState {
  // Solo pasa a true cuando el service worker (registrado en main.tsx con registerType:
  // 'prompt', ver vite.config.ts) detecta una versión nueva ya instalada y en espera. Antes de
  // este punto no hay nada que ofrecer: la app sigue sirviéndose desde la versión cacheada
  // actual sin ningún aviso.
  updateAvailable: boolean;
  // Envuelve la función `updateSW` que devuelve `registerSW` (virtual:pwa-register) para la
  // versión concreta detectada — activa el nuevo service worker y recarga la página. Solo debe
  // invocarse cuando la persona confirma el aviso (ver PwaUpdateBanner), nunca automáticamente:
  // ese auto-reload silencioso era justamente el bug (issue #34).
  applyUpdate: () => void;
  setUpdateAvailable: (applyUpdate: () => void) => void;
}

// No participa en resetAllStores (features/auth/useCases): no es dato de sesión ni de dominio,
// misma categoría cross-cutting que uiStore/useAppConfigStore — una actualización pendiente
// debe seguir ofreciéndose aunque la persona cierre sesión mientras tanto.
export const usePwaUpdateStore = create<PwaUpdateState>((set) => ({
  updateAvailable: false,
  applyUpdate: () => {},
  setUpdateAvailable: (applyUpdate: () => void) => set({ updateAvailable: true, applyUpdate }),
}));
