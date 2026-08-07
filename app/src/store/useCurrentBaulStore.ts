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
}

// A diferencia de los demás stores de dominio, este NO se limpia en resetAllStores() al cerrar
// sesión: es justo lo contrario de lo que pide, que la app recuerde el último baúl a través de
// un logout/login. No hay riesgo de filtrado entre cuentas en un dispositivo compartido — los
// IDs de baúl son globales, así que si el siguiente usuario no tiene acceso a ese baúl,
// resolveHomeDestination no lo encuentra en su lista y cae al primero suyo; si sí lo tiene
// (es una persona más del mismo baúl compartido), no es una filtración, ya podía verlo.
export const useCurrentBaulStore = create<CurrentBaulState>((set) => ({
  currentBaulId: readStoredBaulId(),

  setCurrentBaulId: (baulId) => {
    writeStoredBaulId(baulId);
    set({ currentBaulId: baulId });
  },
}));
