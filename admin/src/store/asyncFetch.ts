type SetFn<T> = (partial: Partial<T>) => void;

interface AsyncFetchKeys<T> {
  loading: keyof T;
  /** Omit when a failed fetch should be swallowed instead of surfaced (e.g. a non-fatal side panel). */
  error?: keyof T;
}

/**
 * Runs the loading/error/data lifecycle shared by every store fetch action:
 * flip `loading` on, clear `error`, run `fn`, merge its result on success or
 * record the message on `error` on failure, always flipping `loading` back off.
 */
export async function runFetch<T>(
  set: SetFn<T>,
  keys: AsyncFetchKeys<T>,
  fn: () => Promise<Partial<T>>,
  reset?: Partial<T>,
): Promise<void> {
  set({
    [keys.loading]: true,
    ...(keys.error ? { [keys.error]: null } : {}),
    ...reset,
  } as Partial<T>);

  try {
    const data = await fn();
    set({ ...data, [keys.loading]: false } as Partial<T>);
  } catch (error) {
    set({
      [keys.loading]: false,
      ...(keys.error ? { [keys.error]: (error as Error).message } : {}),
    } as Partial<T>);
  }
}
