// Fail-open wrapper around localStorage: modo privado o cuota llena no debe romper la app —
// en el peor caso se pierde la persistencia entre recargas/reinicios, pero el estado en
// memoria sigue funcionando para la sesión actual. Cualquier lectura/escritura de localStorage
// en la app debería pasar por aquí en vez de reimplementar su propio try/catch.

/**
 * Reads and JSON-parses `key`, returning `fallback` if the key is missing, localStorage
 * throws (private mode, disabled storage, ...), or the stored value isn't valid JSON.
 */
export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * JSON-serializes and writes `value` under `key`. Swallows any localStorage error (private
 * mode, quota exceeded, ...) — the write is best-effort.
 */
export function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // fail open — ver comentario al inicio del módulo
  }
}

/**
 * Reads the raw string stored under `key`, or null if missing or localStorage throws.
 */
export function readString(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Writes `value` under `key` as a raw string, or removes the key when `value` is null.
 * Swallows any localStorage error — the write is best-effort.
 */
export function writeString(key: string, value: string | null): void {
  try {
    if (value !== null) {
      localStorage.setItem(key, value);
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    // fail open — ver comentario al inicio del módulo
  }
}
