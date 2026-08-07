import { useEffect, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { useBaulesStore } from '@/store/useBaulesStore';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { loadChapterPhotos } from '@/features/photos/useCases';
import { loadChapterRecuerdos } from '@/features/memories/useCases';
import { useAsyncAction } from '@/hooks/useAsyncAction';

// ChapterRoute depends on a chapter's own photos and its recuerdos, on top of the baúl-wide
// scope useBaulScope already prefetches. Both used to be fetched by two independent, unrelated
// effects: only the photos one gated the screen, so the chapter chrome (Hero, Tabbar) and the
// Recuerdos tab — the default tab — painted as soon as photos arrived, while recuerdos were
// often still in flight. That showed the empty "Aún no hay recuerdos escritos" state for a beat
// before the real recuerdos popped in — the "content paints after the loading screen is
// already gone" glitch. This hook centralizes both fetches — blocking until *both* are cached,
// only fetching whichever is missing — so ChapterRoute has exactly one gate to check, same
// pattern as usePersonaScope at persona level.
export function useChapterScope(baulId: string | undefined, chapterId: string | undefined) {
  const auth = useAuth();
  const { run } = useAsyncAction();
  const { photos } = useBaulesStore();
  const { chapterRecuerdos } = useRecuerdosStore();

  const [isLoading, setIsLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = async () => {
    if (!baulId || !chapterId) return;

    const { photos } = useBaulesStore.getState();
    const { chapterRecuerdos } = useRecuerdosStore.getState();
    const needsPhotos = !photos[chapterId];
    const needsRecuerdos = !chapterRecuerdos[chapterId];
    if (!needsPhotos && !needsRecuerdos) return;

    setIsLoading(true);
    const result = await run(() => Promise.all([
      ...(needsPhotos ? [loadChapterPhotos(chapterId)] : []),
      ...(needsRecuerdos ? [loadChapterRecuerdos(baulId, chapterId)] : []),
    ]), { errorMessage: 'Error al cargar el capítulo' });
    setLoadFailed(!result.ok);
    setIsLoading(false);
  };

  useEffect(() => {
    if (auth.isAuthenticated) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baulId, chapterId, auth.isAuthenticated, loadChapterPhotos, loadChapterRecuerdos]);

  return {
    photos: chapterId ? photos[chapterId] : undefined,
    chapterRecuerdos: chapterId ? chapterRecuerdos[chapterId] : undefined,
    isLoading,
    loadFailed,
    retry: load,
  };
}
