import { useCallback, useRef, useState } from 'react';
import { useUIStore } from '@/store/uiStore';

const DEFAULT_KEY = '__default__';

export type AsyncActionResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: unknown };

export interface RunOptions {
  /** Identifica una acción concreta cuando una misma pantalla tiene varias en curso a la vez
   * (p. ej. una fila de una lista) — sin key, isPending() refleja "hay algo en curso" a nivel de pantalla. */
  key?: string;
  successMessage?: string;
  errorMessage?: string | ((error: unknown) => string);
}

// Envuelve una acción async con el patrón try/catch + toast + log que se repetía en
// cada Route, y expone el estado de carga que faltaba para pilotar botones/modales.
// `run` nunca relanza el error (lo reporta via toast y lo devuelve en el resultado) para
// que los call-sites "fire-and-forget" no dejen unhandled rejections sueltas.
export function useAsyncAction() {
  const [pendingKeys, setPendingKeys] = useState<ReadonlySet<string>>(new Set());
  const inFlight = useRef<Set<string>>(new Set());
  const showToastMessage = useUIStore((state) => state.showToastMessage);

  const run = useCallback(
    async <T,>(fn: () => Promise<T>, options: RunOptions = {}): Promise<AsyncActionResult<T>> => {
      const key = options.key ?? DEFAULT_KEY;
      if (inFlight.current.has(key)) {
        return { ok: false, error: new Error('already-pending') };
      }

      inFlight.current.add(key);
      setPendingKeys((prev) => new Set(prev).add(key));

      try {
        const value = await fn();
        if (options.successMessage) showToastMessage(options.successMessage);
        return { ok: true, value };
      } catch (error) {
        console.error(error);
        const message =
          typeof options.errorMessage === 'function' ? options.errorMessage(error) : options.errorMessage;
        showToastMessage(message ?? 'Ha ocurrido un error. Inténtalo de nuevo.');
        return { ok: false, error };
      } finally {
        inFlight.current.delete(key);
        setPendingKeys((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [showToastMessage]
  );

  const isPending = useCallback((key: string = DEFAULT_KEY) => pendingKeys.has(key), [pendingKeys]);

  return { run, isPending };
}
