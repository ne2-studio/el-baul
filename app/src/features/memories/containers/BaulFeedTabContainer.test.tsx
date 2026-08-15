// @vitest-environment jsdom
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FeedItem, Photo, PhotoBatch, Recuerdo } from '@/types';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { BaulFeedTabContainer } from './BaulFeedTabContainer';

vi.mock('react-oidc-context', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

vi.mock('@/api', () => ({
  api: { recuerdos: { createShareLink: vi.fn() } },
  isForbiddenError: () => false,
  isUnauthorizedError: () => false,
}));

vi.mock('@/features/memories/useCases', () => ({
  editRecuerdo: vi.fn(),
  loadBaulFeed: vi.fn(),
  loadMoreBaulFeed: vi.fn(),
}));

vi.mock('@/features/sharing/sharePublicLink', () => ({
  sharePublicLink: vi.fn(),
}));

vi.mock('@/features/photos/useCases', () => ({
  loadChapterPhotos: vi.fn(),
}));

import { api } from '@/api';
import { sharePublicLink } from '@/features/sharing/sharePublicLink';
import { loadChapterPhotos } from '@/features/photos/useCases';
import { loadBaulFeed, loadMoreBaulFeed } from '@/features/memories/useCases';

const baulId = 'baul-1';

let triggerIntersection: (isIntersecting: boolean) => void = () => {};

function stubIntersectionObserver() {
  class TestIntersectionObserver {
    constructor(callback: IntersectionObserverCallback) {
      triggerIntersection = (isIntersecting: boolean) =>
        callback([{ isIntersecting } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
    }
    observe = vi.fn();
    disconnect = vi.fn();
  }
  vi.stubGlobal('IntersectionObserver', TestIntersectionObserver);
}

function recuerdo(overrides: Partial<Recuerdo> = {}): Recuerdo {
  return {
    id: 'r1', text: 'Un buen día', userName: 'Papá', personaId: 'p1',
    createdAt: new Date().toISOString(), isOwn: false, ...overrides,
  } as Recuerdo;
}

function photoBatch(overrides: Partial<PhotoBatch> = {}): PhotoBatch {
  return {
    batchId: 'batch-1', userId: 'user-1', userName: 'Ana', photoCount: 2,
    createdAt: new Date().toISOString(), previewPhotos: [], ...overrides,
  } as PhotoBatch;
}

function renderContainer() {
  return render(
    <MemoryRouter initialEntries={[`/baules/${baulId}`]}>
      <Routes>
        <Route
          path="/baules/:baulId"
          element={<BaulFeedTabContainer baulId={baulId} baulName="Familia García" />}
        />
        <Route path="/baules/:baulId/personas/:personaId" element={<div>Ficha de persona</div>} />
        <Route path="/baules/:baulId/recordar" element={<div>Chat</div>} />
        <Route path="/baules/:baulId/fotos-sueltas/foto/:photoId" element={<div>Visor · fotos sueltas</div>} />
        <Route path="/baules/:baulId/capitulos/:chapterId/foto/:photoId" element={<div>Visor · capítulo</div>} />
        <Route path="/baules/:baulId/subida/:batchId" element={<div>Grid del lote</div>} />
        <Route path="/baules/:baulId/subida/:batchId/foto/:photoId" element={<div>Visor · lote</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('BaulFeedTabContainer', () => {
  beforeEach(() => {
    useRecuerdosStore.setState({ recuerdos: {}, chapterRecuerdos: {}, baulRecuerdos: {}, baulFeed: {}, baulFeedHasMore: {} });
    useAppConfigStore.setState({ chatEnabled: false, sharedLinksEnabled: false, baulFeedEnabled: false });
    vi.clearAllMocks();
    // A test whose sentinel never mounts (no onLoadMore/hasMore) never constructs a new
    // IntersectionObserver, so without this reset triggerIntersection would still point at
    // whichever earlier test's stub last constructed one — a leak across tests, not a real
    // product behavior. Only tests that call stubIntersectionObserver() exercise this at all.
    triggerIntersection = () => {};
  });

  it('renders the recuerdos cached for this baúl', () => {
    useRecuerdosStore.setState({ baulRecuerdos: { [baulId]: [recuerdo()] } });

    renderContainer();

    expect(screen.getByText('Un buen día')).toBeInTheDocument();
  });

  it('navigates to the persona detail screen on user click', async () => {
    const user = userEvent.setup();
    useRecuerdosStore.setState({ baulRecuerdos: { [baulId]: [recuerdo()] } });

    renderContainer();
    await user.click(screen.getByRole('button', { name: 'Ver perfil de Papá' }));

    expect(screen.getByText('Ficha de persona')).toBeInTheDocument();
  });

  it('shares a recuerdo through the sharing flow only when links are enabled', async () => {
    const user = userEvent.setup();
    useAppConfigStore.setState({ sharedLinksEnabled: true });
    useRecuerdosStore.setState({ baulRecuerdos: { [baulId]: [recuerdo()] } });
    vi.mocked(api.recuerdos.createShareLink).mockResolvedValue({ url: 'https://el-baul.app/r/r1', token: 'tok' });

    renderContainer();
    await user.click(screen.getByRole('button', { name: 'Compartir recuerdo' }));

    expect(api.recuerdos.createShareLink).toHaveBeenCalledWith('r1');
    expect(sharePublicLink).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://el-baul.app/r/r1' }));
  });

  it('does not offer sharing when links are disabled', () => {
    useRecuerdosStore.setState({ baulRecuerdos: { [baulId]: [recuerdo()] } });

    renderContainer();

    expect(screen.queryByRole('button', { name: 'Compartir recuerdo' })).not.toBeInTheDocument();
  });

  it('navigates to the AI chat via the FAB only when chat is enabled', async () => {
    const user = userEvent.setup();
    useAppConfigStore.setState({ chatEnabled: true });
    useRecuerdosStore.setState({ baulRecuerdos: { [baulId]: [recuerdo()] } });

    renderContainer();
    await user.click(screen.getByRole('button', { name: /recordemos juntos/i }));

    expect(screen.getByText('Chat')).toBeInTheDocument();
  });

  it('hides the chat FAB when chat is disabled', () => {
    useRecuerdosStore.setState({ baulRecuerdos: { [baulId]: [recuerdo()] } });

    renderContainer();

    expect(screen.queryByRole('button', { name: /recordemos juntos/i })).not.toBeInTheDocument();
  });

  it('opens a loose photo directly, without loading chapter photos first', async () => {
    const user = userEvent.setup();
    useRecuerdosStore.setState({ baulRecuerdos: { [baulId]: [recuerdo({ photoId: 'photo-1', chapterId: undefined })] } });

    renderContainer();
    await user.click(screen.getByRole('button', { name: 'Ver foto' }));

    expect(loadChapterPhotos).not.toHaveBeenCalled();
    expect(screen.getByText('Visor · fotos sueltas')).toBeInTheDocument();
  });

  it('loads the chapter photos before opening a photo that belongs to a chapter', async () => {
    const user = userEvent.setup();
    vi.mocked(loadChapterPhotos).mockResolvedValue(undefined);
    useRecuerdosStore.setState({ baulRecuerdos: { [baulId]: [recuerdo({ photoId: 'photo-1', chapterId: 'chapter-1' })] } });

    renderContainer();
    await user.click(screen.getByRole('button', { name: 'Ver foto' }));

    expect(loadChapterPhotos).toHaveBeenCalledWith('chapter-1');
    expect(screen.getByText('Visor · capítulo')).toBeInTheDocument();
  });

  // Behind Features:BaulFeedEnabled: the mixed feed (recuerdos + photo-upload-batch cards)
  // instead of the recuerdos-only endpoint/cache.
  describe('with baulFeedEnabled on', () => {
    beforeEach(() => {
      useAppConfigStore.setState({ baulFeedEnabled: true });
    });

    it('does not render from baulRecuerdos even if cached — only from baulFeed', () => {
      useRecuerdosStore.setState({ baulRecuerdos: { [baulId]: [recuerdo({ text: 'texto viejo' })] } });

      renderContainer();

      expect(screen.queryByText('texto viejo')).not.toBeInTheDocument();
    });

    it('loads the feed when not yet cached, and skips loading when it is', () => {
      renderContainer();
      expect(loadBaulFeed).toHaveBeenCalledWith(baulId);

      vi.mocked(loadBaulFeed).mockClear();
      useRecuerdosStore.setState({ baulFeed: { [baulId]: [] } });
      renderContainer();

      expect(loadBaulFeed).not.toHaveBeenCalled();
    });

    it('renders both recuerdo and photo-batch cards from the merged feed', () => {
      const feed: FeedItem[] = [
        { type: 'recuerdo', createdAt: new Date().toISOString(), isNew: false, recuerdo: recuerdo({ text: 'Un recuerdo del feed' }) },
        { type: 'photo_batch', createdAt: new Date().toISOString(), isNew: false, photoBatch: photoBatch({ userName: 'Tita Loli', photoCount: 6 }) },
      ];
      useRecuerdosStore.setState({ baulFeed: { [baulId]: feed } });

      renderContainer();

      expect(screen.getByText('Un recuerdo del feed')).toBeInTheDocument();
      expect(screen.getByText('Tita Loli')).toBeInTheDocument();
      expect(screen.getByText('subió 6 fotos', { exact: false })).toBeInTheDocument();
    });

    it('opens the batch grid from the "y N más" tile', async () => {
      const user = userEvent.setup();
      const feed: FeedItem[] = [{
        type: 'photo_batch',
        createdAt: new Date().toISOString(),
        isNew: false,
        photoBatch: photoBatch({
          batchId: 'batch-42',
          photoCount: 10,
          previewPhotos: [
            new Photo({ id: 'p1', baulId, thumbnailUrl: 't1', fullUrl: 'f1', uploadedBy: 'user-1', createdAt: new Date().toISOString(), recuerdoCount: 0, canDelete: false, canRequestRemoval: true, alreadyExisted: false }),
          ],
        }),
      }];
      useRecuerdosStore.setState({ baulFeed: { [baulId]: feed } });

      renderContainer();
      await user.click(screen.getByRole('button', { name: 'y 9 más' }));

      expect(screen.getByText('Grid del lote')).toBeInTheDocument();
    });

    it('opens the batch gallery directly from a preview thumbnail', async () => {
      const user = userEvent.setup();
      const feed: FeedItem[] = [{
        type: 'photo_batch',
        createdAt: new Date().toISOString(),
        isNew: false,
        photoBatch: photoBatch({
          batchId: 'batch-42',
          photoCount: 1,
          previewPhotos: [
            new Photo({ id: 'p1', baulId, thumbnailUrl: 't1', fullUrl: 'f1', uploadedBy: 'user-1', createdAt: new Date().toISOString(), recuerdoCount: 0, canDelete: false, canRequestRemoval: true, alreadyExisted: false }),
          ],
        }),
      }];
      useRecuerdosStore.setState({ baulFeed: { [baulId]: feed } });

      renderContainer();
      await user.click(screen.getByRole('button', { name: 'Ver foto' }));

      expect(screen.getByText('Visor · lote')).toBeInTheDocument();
    });

    it('loads the next page when the scroll sentinel intersects and hasMore is true', async () => {
      stubIntersectionObserver();
      const feed: FeedItem[] = [{ type: 'recuerdo', createdAt: new Date().toISOString(), isNew: false, recuerdo: recuerdo() }];
      useRecuerdosStore.setState({ baulFeed: { [baulId]: feed }, baulFeedHasMore: { [baulId]: true } });

      renderContainer();
      act(() => triggerIntersection(true));

      expect(loadMoreBaulFeed).toHaveBeenCalledWith(baulId);
    });

    it('does not load more once hasMore is false', async () => {
      stubIntersectionObserver();
      const feed: FeedItem[] = [{ type: 'recuerdo', createdAt: new Date().toISOString(), isNew: false, recuerdo: recuerdo() }];
      useRecuerdosStore.setState({ baulFeed: { [baulId]: feed }, baulFeedHasMore: { [baulId]: false } });

      renderContainer();
      act(() => triggerIntersection(true));

      expect(loadMoreBaulFeed).not.toHaveBeenCalled();
    });
  });

  it('never offers infinite scroll (no sentinel wired) while the toggle is off', () => {
    stubIntersectionObserver();
    useRecuerdosStore.setState({ baulRecuerdos: { [baulId]: [recuerdo()] } });

    renderContainer();
    act(() => triggerIntersection(true));

    expect(loadMoreBaulFeed).not.toHaveBeenCalled();
  });
});
