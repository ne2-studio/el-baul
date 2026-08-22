// @vitest-environment jsdom
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Baul } from '@/types';
import { useBaulesStore } from '@/store/useBaulesStore';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { usePersonasStore } from '@/store/usePersonasStore';
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
vi.mock('@/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api')>();
  return { ...actual, api: { ...actual.api, baules: { ...actual.api.baules, getScope: vi.fn() } } };
});

import { api } from '@/api';

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
    useBaulesStore.setState({ baules: [baul], chapters: {}, photos: {}, loosePhotos: {}, isLoading: false });
    useRecuerdosStore.setState({ baulRecuerdos: {}, baulFeed: {}, baulFeedHasMore: {}, chapterRecuerdos: {} });
    usePersonasStore.setState({ personas: {} });
    useUIStore.setState({ isFirstAppLaunch: true });
    vi.mocked(api.baules.getScope).mockReset();
  });

  // Regression coverage for the bug useBaulScope.ts documents at length: the whole scope
  // (chapters/recuerdos/personas/feed) now arrives in one request, so there's no intermediate
  // render where some pieces are cached and others aren't — the loader must stay up for the
  // entire request, not flicker or resolve early on a partial write.
  it('keeps the opening-baúl loader up until the single scope request resolves', async () => {
    let resolveScope: () => void = () => {};
    vi.mocked(api.baules.getScope).mockImplementation(() => new Promise((resolve) => {
      resolveScope = () => resolve({
        baul, chapters: [], loosePhotos: [], recuerdos: [], personas: [],
        removalRequests: null, baulFeed: { feedItems: [], hasMore: false },
      });
    }));

    renderAt(`/baules/${baul.id}`);

    expect(await screen.findByText('Abriendo baúl...')).toBeInTheDocument();
    await waitFor(() => expect(api.baules.getScope).toHaveBeenCalledWith(baul.id, true));
    expect(screen.queryByText('Feed real')).not.toBeInTheDocument();

    resolveScope();

    await waitFor(() => expect(screen.getByText('Feed real')).toBeInTheDocument());
    expect(screen.queryByText('Abriendo baúl...')).not.toBeInTheDocument();
  });
});
