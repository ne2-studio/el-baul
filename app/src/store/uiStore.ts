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
}

export const useUIStore = create<UIState>((set) => ({
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
}));
