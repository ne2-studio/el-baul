import { create } from 'zustand';
import type { ToastVariant } from '@/design-system/components/feedback/Toast';

const CONTRIBUTION_SUGGESTION_COOLDOWN_STORAGE_KEY = 'elbaul.contributionSuggestionCooldowns';
// Fijo en cliente a propósito (no viene del backend ni es configurable): 60 minutos.
const CONTRIBUTION_SUGGESTION_COOLDOWN_MS = 60 * 60 * 1000;

// try/catch en ambos lados, mismo motivo que useCurrentBaulStore: modo privado o cuota de
// localStorage llena no debe romper la app — en el peor caso se pierde la persistencia entre
// reinicios y el cooldown vuelve a comportarse como si nunca se hubiera mostrado nada.
function readContributionSuggestionCooldowns(): Record<string, number> {
  try {
    const raw = localStorage.getItem(CONTRIBUTION_SUGGESTION_COOLDOWN_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeContributionSuggestionCooldowns(cooldowns: Record<string, number>): void {
  try {
    localStorage.setItem(CONTRIBUTION_SUGGESTION_COOLDOWN_STORAGE_KEY, JSON.stringify(cooldowns));
  } catch {
    // ver comentario de readContributionSuggestionCooldowns
  }
}

const REMOVAL_REQUESTED_PHOTO_IDS_STORAGE_KEY = 'elbaul.removalRequestedPhotoIds';

// Mismo motivo que readContributionSuggestionCooldowns: fail-open, nunca romper la app por
// localStorage en modo privado o con cuota llena.
function readRemovalRequestedPhotoIds(): string[] {
  try {
    const raw = localStorage.getItem(REMOVAL_REQUESTED_PHOTO_IDS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeRemovalRequestedPhotoIds(ids: string[]): void {
  try {
    localStorage.setItem(REMOVAL_REQUESTED_PHOTO_IDS_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // ver comentario de readRemovalRequestedPhotoIds
  }
}

const HAS_LAUNCHED_APP_STORAGE_KEY = 'elbaul.hasLaunchedApp';

// Se calcula una sola vez, al cargar este módulo (arranque de la app) — no en cada mount de
// BaulRoute, porque BaulRoute vuelve a leer/decidir en un efecto cada vez que cambia de baúl
// (ver BaulRoute.tsx) y una función que se pudiera llamar más de una vez marcaría "ya lanzada"
// a mitad de la primerísima sesión, dejando el segundo baúl visitado con un resultado
// distinto al primero. Al ser un `const` de módulo, todo el que importe el store durante esta
// carga de página ve el mismo valor.
const IS_FIRST_APP_LAUNCH = (() => {
  try {
    if (localStorage.getItem(HAS_LAUNCHED_APP_STORAGE_KEY)) return false;
    localStorage.setItem(HAS_LAUNCHED_APP_STORAGE_KEY, '1');
    return true;
  } catch {
    // modo privado o cuota llena: no podemos saber si es la primera vez, así que no bloqueamos
    // la sugerencia — mismo criterio "fail open" que readContributionSuggestionCooldowns.
    return false;
  }
})();

interface UIState {
  // Toast state
  showToast: boolean;
  toastMessage: string;
  toastVariant: ToastVariant;
  showToastMessage: (message: string, variant?: ToastVariant) => void;
  hideToast: () => void;

  // Modals state
  showProfileMenu: boolean;
  setShowProfileMenu: (show: boolean) => void;

  // Recomendación de contribución (ver ContributionSuggestionContainer): una vez mostrada y
  // resuelta (guardada u "ahora no"), no debe volver a proponerse en ESE baúl durante el
  // cooldown — pero cambiar a otro baúl sí debe poder proponer una sugerencia nueva, de ahí la
  // clave por baulId en vez de un flag global. Persistido en localStorage (sobrevive a cerrar y
  // reabrir la app) pero nunca en backend: es un throttle de cliente, no un estado de dominio.
  isContributionSuggestionOnCooldown: (baulId: string) => boolean;
  startContributionSuggestionCooldown: (baulId: string) => void;

  // Verdadero solo durante la primerísima sesión de este navegador/dispositivo (ver
  // IS_FIRST_APP_LAUNCH arriba) — BaulRoute lo usa junto al cooldown para no proponer la
  // recomendación de contribución antes de que la persona haya visto el resto de la app.
  isFirstAppLaunch: boolean;

  // Fotos para las que este dispositivo ya ha enviado una solicitud de retirada (ver
  // usePhotoViewerActions). Cliente-only, nunca en backend: leer el estado de una solicitud
  // (GET /removal-requests) exige AccessLevel.Admin, así que un colaborador normal no tiene
  // otra forma de saber si ya solicitó la retirada de una foto concreta. Persistido en
  // localStorage para sobrevivir a recargar/cerrar la app, pero no se limpia nunca — si el
  // custodio rechaza la solicitud, hoy no hay forma de volver a habilitar el botón desde aquí.
  removalRequestedPhotoIds: string[];
  hasRequestedPhotoRemoval: (photoId: string) => boolean;
  markPhotoRemovalRequested: (photoId: string) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  // Toast
  showToast: false,
  toastMessage: '',
  toastVariant: 'success',
  showToastMessage: (message: string, variant: ToastVariant = 'success') => {
    set({ showToast: true, toastMessage: message, toastVariant: variant });
    // Auto-hide after 3 seconds
    setTimeout(() => {
      set({ showToast: false });
    }, 3000);
  },
  hideToast: () => set({ showToast: false }),

  // Modals
  showProfileMenu: false,
  setShowProfileMenu: (show) => set({ showProfileMenu: show }),

  isContributionSuggestionOnCooldown: (baulId) => {
    const dismissedAt = readContributionSuggestionCooldowns()[baulId];
    return dismissedAt !== undefined && Date.now() - dismissedAt < CONTRIBUTION_SUGGESTION_COOLDOWN_MS;
  },
  startContributionSuggestionCooldown: (baulId) => {
    const cooldowns = readContributionSuggestionCooldowns();
    // Aprovecha la escritura para descartar entradas ya caducadas — sin esto, un baúl visitado
    // una vez se queda en localStorage para siempre.
    for (const [id, dismissedAt] of Object.entries(cooldowns)) {
      if (Date.now() - dismissedAt >= CONTRIBUTION_SUGGESTION_COOLDOWN_MS) delete cooldowns[id];
    }
    cooldowns[baulId] = Date.now();
    writeContributionSuggestionCooldowns(cooldowns);
  },

  isFirstAppLaunch: IS_FIRST_APP_LAUNCH,

  removalRequestedPhotoIds: readRemovalRequestedPhotoIds(),
  hasRequestedPhotoRemoval: (photoId) => get().removalRequestedPhotoIds.includes(photoId),
  markPhotoRemovalRequested: (photoId) => {
    if (get().removalRequestedPhotoIds.includes(photoId)) return;
    const ids = [...get().removalRequestedPhotoIds, photoId];
    writeRemovalRequestedPhotoIds(ids);
    set({ removalRequestedPhotoIds: ids });
  },
}));
