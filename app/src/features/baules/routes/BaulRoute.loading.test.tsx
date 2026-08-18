// @vitest-environment jsdom
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
vi.mock('@/features/memories/useCases', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/memories/useCases')>();
  return {
    ...actual,
    loadBaulFeed: vi.fn(),
  };
});

import { loadBaulFeed } from '@/features/memories/useCases';

const baul = { id: 'baul-1', name: 'Familia García', chapterCount: 0 } as Baul;

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/baules/:baulId" element={<BaulRoute />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('BaulRoute loading', () => {
  beforeEach(() => {
    useBaulesStore.setState({
      baules: [baul],
      chapters: { [baul.id]: [] },
      photos: {},
      loosePhotos: { [baul.id]: [] },
      isLoading: false,
    });
    useRecuerdosStore.setState({
      baulRecuerdos: { [baul.id]: [] },
      baulFeed: {},
      baulFeedHasMore: {},
      chapterRecuerdos: {},
    });
    usePersonasStore.setState({ personas: { [baul.id]: [] } });
    useAppConfigStore.setState({ baulFeedEnabled: true });
    useUIStore.setState({ isFirstAppLaunch: true });
    vi.clearAllMocks();
  });

  it('keeps initial feed loading inside the opening-baúl loader', async () => {
    let resolveFeed: () => void = () => {};
    vi.mocked(loadBaulFeed).mockImplementation(() => new Promise<void>((resolve) => {
      resolveFeed = () => {
        useRecuerdosStore.setState((state) => ({
          baulFeed: { ...state.baulFeed, [baul.id]: [] },
          baulFeedHasMore: { ...state.baulFeedHasMore, [baul.id]: false },
        }));
        resolve();
      };
    }));

    renderAt(`/baules/${baul.id}`);

    expect(await screen.findByText('Abriendo baúl...')).toBeInTheDocument();
    expect(screen.queryByText('Cargando el feed...')).not.toBeInTheDocument();
    await waitFor(() => expect(loadBaulFeed).toHaveBeenCalledWith(baul.id));

    resolveFeed();
  });
});
