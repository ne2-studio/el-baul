// Shared control flow for "apply a change to a Zustand store slice before the server confirms
// it, then either accept the server's response or roll back". Every optimistic mutation
// (setBaulCover, setChapterCover, updateUserRole, and any future one) follows the same four
// steps: snapshot the current slice, optionally apply the optimistic value, await the async
// operation (which is responsible for applying the server's response on success), and on
// failure restore the snapshot before rethrowing.
//
// Concurrency: if two optimistic calls race on the same slice (e.g. two setBaulCover calls for
// the same baúl), a naive rollback would always restore the value from *before its own*
// optimistic apply — even if a second, still-in-flight call has since applied its own
// optimistic value on top. That would clobber the second call's optimistic UI with stale data
// nobody asked to see again. To avoid that, rollback only fires if the slice is still exactly
// what this call last wrote (reference equality) — i.e. nothing else has touched it since. If
// something else did, that update wins and this call's failure is reported (via the rethrow)
// without stomping on it.
export async function withOptimisticUpdate<TSnapshot>(config: {
  getSnapshot: () => TSnapshot;
  applyOptimistic?: () => void;
  rollback: (previous: TSnapshot) => void;
  operation: () => Promise<void>;
}): Promise<void> {
  const { getSnapshot, applyOptimistic, rollback, operation } = config;
  const previous = getSnapshot();
  let lastWritten = previous;
  if (applyOptimistic) {
    applyOptimistic();
    lastWritten = getSnapshot();
  }
  try {
    await operation();
  } catch (error) {
    if (getSnapshot() === lastWritten) {
      rollback(previous);
    }
    throw error;
  }
}
