import { useState } from 'react';

export type ScopeOutcome = 'failed' | 'not-found' | null;

// Shared by useBaulScope/useChapterScope/usePersonaScope: each loads its own scope for a given
// id (or composite key) and needs to tell "still loading" (null) apart from "already tried and
// it didn't work" (failed/not-found) — without ever showing the previous id's outcome, even for
// an instant, once the id has changed.
//
// The reset below happens during render, not in an effect: callers like BaulRoute,
// ChapterRoute and PersonaDetailRoute don't unmount when their id param changes (same component
// instance, only the param differs — e.g. BatchPhotoActionsContainer navigating straight from
// one chapter's URL to another's), so an effect-based reset would always land one render late,
// letting the previous id's outcome apply — however briefly — to the new one. This is the
// pattern React's own docs recommend for "adjusting state when a prop changes" without that gap.
export function useScopeOutcome(key: string) {
  const [outcome, setOutcome] = useState<{ key: string; result: ScopeOutcome }>({ key, result: null });
  const result = outcome.key === key ? outcome.result : null;
  if (outcome.key !== key) {
    setOutcome({ key, result: null });
  }

  return {
    result,
    // Tags the outcome with the key it's actually *for* (the id the caller was fetching when
    // it started), not necessarily this hook's current key — a slow response for an id the
    // caller has since navigated away from is discarded by the render-time reset above the
    // moment it no longer matches, instead of being mistaken for the current id's result.
    // Callers should resolve every completed attempt explicitly — `null` on success too, not
    // just failure — so a previous failure can't linger after a later attempt succeeds.
    setOutcome: (forKey: string, outcome: ScopeOutcome) => setOutcome({ key: forKey, result: outcome }),
    // Clears the current key's outcome without waiting for a new attempt to resolve — callers
    // combine this with re-running their own load to build an awaitable `retry()`.
    reset: () => setOutcome({ key, result: null }),
  };
}
