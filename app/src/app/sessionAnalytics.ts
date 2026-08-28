import { api } from '@/api';
import { getClientPlatform } from '@/utils/platform';
import { resolveEntrySourceForSessionOpen } from '@/utils/entrySource';
import { readString, writeString } from '@/utils/safeLocalStorage';

// "Sesión" para DAU = una apertura de la app tras al menos 30 min sin reportar una (mismo
// umbral que Google Analytics usa para separar sesiones). No es una sesión de autenticación:
// el usuario sigue logueado durante todo ese tiempo, esto solo throttlea cuántas filas de
// analytics.user_sessions genera una persona que usa la app de forma continuada.
const SESSION_GAP_MS = 30 * 60 * 1000;
const LAST_REPORTED_AT_STORAGE_KEY = 'elbaul.lastSessionReportedAt';

// Fire-and-forget, mismo patrón que markOnboardingSeen: nunca debe bloquear ni romper la
// navegación por un fallo de red o de localStorage. Llamado desde App.tsx cada vez que
// auth.isAuthenticated pasa a true; el propio gate de 30 min hace que la mayoría de esas
// llamadas no lleguen a golpear la red.
export async function reportSessionOpen(now: number = Date.now()): Promise<void> {
  const lastReportedAt = Number(readString(LAST_REPORTED_AT_STORAGE_KEY) ?? 0);
  if (now - lastReportedAt < SESSION_GAP_MS) return;

  try {
    const platform = getClientPlatform();
    const entrySource = resolveEntrySourceForSessionOpen(window.location.search);
    await api.analytics.reportSessionOpen(platform, entrySource);
    writeString(LAST_REPORTED_AT_STORAGE_KEY, String(now));
  } catch (error) {
    console.log('Failed to report session open:', error);
  }
}
