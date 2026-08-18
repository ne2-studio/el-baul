import { create } from 'zustand';
import { readString, writeString } from '@/utils/safeLocalStorage';

const STORAGE_KEY = 'elbaul.currentBaulId';

function readStoredBaulId(): string | null {
  return readString(STORAGE_KEY);
}

function writeStoredBaulId(baulId: string | null): void {
  writeString(STORAGE_KEY, baulId);
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
