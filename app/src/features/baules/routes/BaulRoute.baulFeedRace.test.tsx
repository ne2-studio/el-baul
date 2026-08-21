// @vitest-environment jsdom
//
// Regression for a real production bug: `app-config` (which carries `baulFeedEnabled`) can
// resolve *while* the initial chapters/recuerdos/personas load triggered by useBaulScope is
// still in flight. When that happens, `needsBaulFeed` was `false` at the moment loadScope ran
// (so it never fetched the feed), but by the time that load finishes `hasScope` demands
// `baulFeed[id]` because the flag flipped on mid-flight — and `isLoading` never dipped to
// `false` in between, so the effect that would retry never re-fires. The person is stuck on
// "Abriendo baúl..." forever, with no error and no retry — see useBaulScope.ts.
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Baul } from '@/types';
import { useBaulesStore } from '@/store/useBaulesStore';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { usePersonasStore } from '@/store/usePersonasStore';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { useUIStore } from '@/store/uiStore';
import { BaulRoute } from './BaulRoute';

vi.mock('react-oidc-context', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub);
vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

vi.mock('@/features/baules/containers/WorkspaceSwitcherContainer', () => ({
  WorkspaceSwitcherContainer: () => null,
}));
vi.mock('@/features/baules/containers/BaulSettingsMenuContainer', () => ({
  BaulSettingsMenuContainer: () => null,
}));
vi.mock('@/features/contributions/containers/ContributionSuggestionGateContainer', () => ({
  ContributionSuggestionGateContainer: () => null,
}));
vi.mock('@/features/baules/containers/BaulChaptersTabContainer', () => ({
  BaulChaptersTabContainer: () => null,
}));
vi.mock('@/features/people/containers/BaulPersonasTabContainer', () => ({
  BaulPersonasTabContainer: () => null,
}));
vi.mock('@/features/memories/containers/BaulFeedTabContainer', () => ({
  BaulFeedTabContainer: () => <div>Feed real</div>,
}));
vi.mock('@/features/baules/useCases', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/baules/useCases')>();
  return { ...actual, loadChapters: vi.fn() };
});
vi.mock('@/features/photos/useCases', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/photos/useCases')>();
  return { ...actual, loadLoosePhotos: vi.fn() };
});
vi.mock('@/features/people/useCases', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/people/useCases')>();
  return { ...actual, loadPersonas: vi.fn() };
});
vi.mock('@/features/memories/useCases', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/memories/useCases')>();
  return { ...actual, loadBaulRecuerdos: vi.fn(), loadBaulFeed: vi.fn() };
});

import { loadChapters } from '@/features/baules/useCases';
import { loadLoosePhotos } from '@/features/photos/useCases';
import { loadPersonas } from '@/features/people/useCases';
import { loadBaulRecuerdos, loadBaulFeed } from '@/features/memories/useCases';

const baul = { id: 'baul-1', name: 'Familia García', chapterCount: 0 } as Baul;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/baules/:baulId" element={<BaulRoute />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('BaulRoute — carrera de baulFeedEnabled durante la carga inicial del scope', () => {
  beforeEach(() => {
    useBaulesStore.setState({
      baules: [baul],
      chapters: {},
      photos: {},
      loosePhotos: {},
      isLoading: false,
    });
    useRecuerdosStore.setState({
      baulRecuerdos: {},
      baulFeed: {},
      baulFeedHasMore: {},
      chapterRecuerdos: {},
    });
    usePersonasStore.setState({ personas: {} });
    // Arranca apagado, como en app-config antes de resolver — la carrera consiste en que se
    // active mientras loadScope ya está en marcha.
    useAppConfigStore.setState({ baulFeedEnabled: false });
    useUIStore.setState({ isFirstAppLaunch: true });
    vi.clearAllMocks();
  });

  it('acaba cargando el feed y saliendo del loader cuando baulFeedEnabled se activa a mitad de la carga inicial', async () => {
    const chaptersDeferred = deferred<void>();
    const loosePhotosDeferred = deferred<void>();
    const recuerdosDeferred = deferred<void>();
    const personasDeferred = deferred<void>();

    vi.mocked(loadChapters).mockImplementation(() =>
      chaptersDeferred.promise.then(() => {
        useBaulesStore.setState((state) => ({ chapters: { ...state.chapters, [baul.id]: [] } }));
      })
    );
    vi.mocked(loadLoosePhotos).mockImplementation(() =>
      loosePhotosDeferred.promise.then(() => {
        useBaulesStore.setState((state) => ({ loosePhotos: { ...state.loosePhotos, [baul.id]: [] } }));
      })
    );
    vi.mocked(loadBaulRecuerdos).mockImplementation(() =>
      recuerdosDeferred.promise.then(() => {
        useRecuerdosStore.setState((state) => ({ baulRecuerdos: { ...state.baulRecuerdos, [baul.id]: [] } }));
      })
    );
    vi.mocked(loadPersonas).mockImplementation(() =>
      personasDeferred.promise.then(() => {
        usePersonasStore.setState((state) => ({ personas: { ...state.personas, [baul.id]: [] } }));
      })
    );
    vi.mocked(loadBaulFeed).mockImplementation(() => {
      useRecuerdosStore.setState((state) => ({
        baulFeed: { ...state.baulFeed, [baul.id]: [] },
        baulFeedHasMore: { ...state.baulFeedHasMore, [baul.id]: false },
      }));
      return Promise.resolve();
    });

    renderAt(`/baules/${baul.id}`);

    expect(await screen.findByText('Abriendo baúl...')).toBeInTheDocument();
    await waitFor(() => expect(loadChapters).toHaveBeenCalledWith(baul.id));

    // app-config responde AQUÍ, con la carga inicial todavía en vuelo — la misma carrera que
    // ocurre en producción (donde app-config, una única llamada ligera, suele resolver antes
    // que las 4-5 llamadas en paralelo de loadScope).
    useAppConfigStore.setState({ baulFeedEnabled: true });

    chaptersDeferred.resolve();
    loosePhotosDeferred.resolve();
    recuerdosDeferred.resolve();
    personasDeferred.resolve();

    await waitFor(() => expect(loadBaulFeed).toHaveBeenCalledWith(baul.id));
    expect(screen.queryByText('Abriendo baúl...')).not.toBeInTheDocument();
  });
});
