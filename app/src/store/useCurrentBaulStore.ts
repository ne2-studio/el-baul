import { create } from 'zustand';

const STORAGE_KEY = 'elbaul.currentBaulId';

// try/catch en ambos lados: modo privado o cuota de localStorage llena no debe romper el
// arranque de la app ni la acción de cambiar de baúl — en el peor caso, se pierde la
// persistencia entre recargas, pero el estado en memoria sigue funcionando para la sesión.
function readStoredBaulId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredBaulId(baulId: string | null): void {
  try {
    if (baulId) {
      localStorage.setItem(STORAGE_KEY, baulId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ver comentario de readStoredBaulId
  }
}

interface CurrentBaulState {
  // El workspace activo: el baúl en el que "vive" el usuario. Persistido en localStorage para
  // que la app abra siempre en el último baúl usado (ver resolveHomeDestination en
  // features/baules/useCases), no en una lista de baúles.
  currentBaulId: string | null;
  setCurrentBaulId: (baulId: string) => void;
  reset: () => void;
}

export const useCurrentBaulStore = create<CurrentBaulState>((set) => ({
  currentBaulId: readStoredBaulId(),

  setCurrentBaulId: (baulId) => {
    writeStoredBaulId(baulId);
    set({ currentBaulId: baulId });
  },

  // Llamado desde resetAllStores() al cerrar sesión / perder autenticación — sin esto, el
  // CurrentBaul de un usuario quedaría filtrado a la siguiente sesión en el mismo dispositivo.
  reset: () => {
    writeStoredBaulId(null);
    set({ currentBaulId: null });
  },
}));
