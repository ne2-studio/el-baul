import { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { api } from '@/api';
import { useBaulesStore } from '@/store/useBaulesStore';
import { hydratePhotos, usePhotosStore } from '@/store/usePhotosStore';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useScopeOutcome } from '@/hooks/useScopeOutcome';

// ChapterRoute depends on a chapter's own photos and its recuerdos, on top of the baúl-wide
// scope useBaulScope already prefetches. Both used to be fetched by two independent, unrelated
// effects: only the photos one gated the screen, so the chapter chrome (Hero, Tabbar) and the
// Recuerdos tab — the default tab — painted as soon as photos arrived, while recuerdos were
// often still in flight. That showed the empty "Aún no hay recuerdos escritos" state for a beat
// before the real recuerdos popped in — the "content paints after the loading screen is
// already gone" glitch. This hook centralizes both fetches — blocking until *both* are cached,
// only fetching whichever is missing — so ChapterRoute has exactly one gate to check, same
// pattern as useBaulScope/usePersonaScope (see useScopeOutcome, shared by all three). Both
// fetches go through a single api.chapters.getScope request — see ChapterScopeAggregator (api/).
export function useChapterScope(baulId: string | undefined, chapterId: string | undefined) {
  const auth = useAuth();
  const { run } = useAsyncAction();
  const { photos } = useBaulesStore();
  const photosById = usePhotosStore((state) => state.photosById);
  const { chapterRecuerdos } = useRecuerdosStore();

  const hasScope = !!chapterId && !!photos[chapterId] && !!chapterRecuerdos[chapterId];
  const { result, setOutcome, reset } = useScopeOutcome(`${baulId ?? ''}:${chapterId ?? ''}`);

  // Derived straight from the store/outcome on every render (not a flag a past effect run set)
  // so that navigating directly from one chapter to another — same ChapterRoute instance, only
  // chapterId changes, e.g. after BatchPhotoActionsContainer moves photos — never shows the
  // previous chapter's "ready" state applied to the new one, even for a single frame.
  const isLoading = !!baulId && !!chapterId && auth.isAuthenticated && !hasScope && result === null;
  const loadFailed = result === 'failed';

  const load = async (id: string, forBaulId: string) => {
    const { photos } = useBaulesStore.getState();
    const { chapterRecuerdos } = useRecuerdosStore.getState();
    if (photos[id] && chapterRecuerdos[id]) return;

    // Keyed by the chapter being fetched, not a fixed/default key — otherwise a fetch for a
    // chapter navigated away from mid-flight would make useAsyncAction dedupe the new
    // chapter's own fetch as "already pending" and silently skip it. See useScopeOutcome for
    // the matching half of this fix (why a stale response can't overwrite the new outcome).
    const scopeResult = await run(
      () => api.chapters.getScope(forBaulId, id),
      { key: `chapter-scope:${forBaulId}:${id}`, errorMessage: 'Error al cargar el capítulo' }
    );

    // Resolved explicitly either way — including on success — so a previous failed attempt
    // (surfaced via retry) can't leave loadFailed stuck true once this one lands.
    if (!scopeResult.ok) {
      setOutcome(`${forBaulId}:${id}`, 'failed');
      return;
    }

    const scope = scopeResult.value;
    usePhotosStore.getState().upsertPhotos(scope.photos);
    useBaulesStore.setState((state) => ({ photos: { ...state.photos, [id]: scope.photos.map((photo) => photo.id) } }));
    useRecuerdosStore.setState((state) => ({ chapterRecuerdos: { ...state.chapterRecuerdos, [id]: scope.recuerdos } }));

    setOutcome(`${forBaulId}:${id}`, null);
  };

  useEffect(() => {
    if (isLoading) load(chapterId!, baulId!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baulId, chapterId, isLoading]);

  return {
    photos: chapterId ? hydratePhotos(photos[chapterId], photosById) : undefined,
    chapterRecuerdos: chapterId ? chapterRecuerdos[chapterId] : undefined,
    isLoading,
    loadFailed,
    retry: () => {
      reset();
      return load(chapterId!, baulId!);
    },
  };
}
