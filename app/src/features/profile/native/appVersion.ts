import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

// Solo para debug/soporte (ver "Versión" en MyAccountScreen) — no hay build nativo en web, así
// que ahí no hay nada útil que mostrar más allá de identificar que es la webapp.
export async function getAppVersion(): Promise<string> {
  if (!Capacitor.isNativePlatform()) return 'web';

  const { version, build } = await CapacitorApp.getInfo();
  return `${version} (${build})`;
}
