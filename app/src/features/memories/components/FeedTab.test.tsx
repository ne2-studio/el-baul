// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChapterCreatedFeed, FeedItem, PhotoBatch, Recuerdo } from '@/types';
import { FeedTab } from '@/features/memories/components/FeedTab';

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

function newRecuerdo(overrides: Partial<ConstructorParameters<typeof Recuerdo>[0]> = {}): Recuerdo {
  return new Recuerdo({
    id: 'r1', userId: 'user-1', text: 'Un recuerdo precioso', userName: 'Ana',
    createdAt: new Date().toISOString(), isOwn: false, ...overrides,
  });
}

function newPhotoBatch(overrides: Partial<ConstructorParameters<typeof PhotoBatch>[0]> = {}): PhotoBatch {
  return new PhotoBatch({
    batchId: 'batch-1', userId: 'user-1', userName: 'Tita Loli', photoCount: 2,
    createdAt: new Date().toISOString(),
    previewPhotos: [{
      id: 'p1', baulId: 'baul-1', thumbnailUrl: 't1', fullUrl: 'f1', uploadedBy: 'user-1',
      createdAt: new Date().toISOString(), recuerdoCount: 0, canDelete: false, canRequestRemoval: true,
    }],
    ...overrides,
  });
}

describe('FeedTab', () => {
  it('shows the empty state when there are no feed items', () => {
    render(<FeedTab feedItems={[]} />);

    expect(screen.getByText('Todavía no hay recuerdos')).toBeInTheDocument();
  });

  it('renders a recuerdo card for a recuerdo item', () => {
    const recuerdo = newRecuerdo({ text: 'Qué buen día' });
    const items: FeedItem[] = [{ type: 'recuerdo', createdAt: recuerdo.createdAt, isNew: false, recuerdo }];

    render(<FeedTab feedItems={items} />);

    expect(screen.getByText('Qué buen día')).toBeInTheDocument();
  });

  it('renders a photo-batch card for a photo_batch item', () => {
    const photoBatch = newPhotoBatch();
    const items: FeedItem[] = [{ type: 'photo_batch', createdAt: photoBatch.createdAt, isNew: false, photoBatch }];

    render(<FeedTab feedItems={items} />);

    expect(screen.getByText('Tita Loli')).toBeInTheDocument();
    expect(screen.getByText('subió 2 fotos', { exact: false })).toBeInTheDocument();
  });

  it('renders both kinds together, in the order given', () => {
    const recuerdo = newRecuerdo({ text: 'Recuerdo reciente' });
    const photoBatch = newPhotoBatch();
    const items: FeedItem[] = [
      { type: 'recuerdo', createdAt: recuerdo.createdAt, isNew: false, recuerdo },
      { type: 'photo_batch', createdAt: photoBatch.createdAt, isNew: false, photoBatch },
    ];

    render(<FeedTab feedItems={items} />);

    const cards = screen.getAllByText(/Recuerdo reciente|Tita Loli/);
    expect(cards.map((el) => el.textContent)).toEqual(['Recuerdo reciente', 'Tita Loli']);
  });

  it('renders a chapter card for a chapter_created item', () => {
    const items: FeedItem[] = [{
      type: 'chapter_created',
      createdAt: new Date().toISOString(),
      isNew: false,
      chapterCreated: new ChapterCreatedFeed({
        chapterId: 'c1', name: 'Verano 2020', createdAt: new Date().toISOString(),
        userId: 'user-1', userName: 'Tita Loli',
      }),
    }];

    render(<FeedTab feedItems={items} />);

    expect(screen.getByText('Tita Loli')).toBeInTheDocument();
    expect(screen.getByText('Verano 2020')).toBeInTheDocument();
  });

  describe('new vs seen swimlanes', () => {
    it('shows no section headers when nothing is new', () => {
      const items: FeedItem[] = [{ type: 'recuerdo', createdAt: new Date().toISOString(), isNew: false, recuerdo: newRecuerdo() }];

      render(<FeedTab feedItems={items} />);

      expect(screen.queryByText('Nueva actividad')).not.toBeInTheDocument();
      expect(screen.queryByText('Ya estás al día')).not.toBeInTheDocument();
    });

    it('shows only the "Nueva actividad" header when every item is new', () => {
      const items: FeedItem[] = [{ type: 'recuerdo', createdAt: new Date().toISOString(), isNew: true, recuerdo: newRecuerdo() }];

      render(<FeedTab feedItems={items} />);

      expect(screen.getByText('Nueva actividad')).toBeInTheDocument();
      expect(screen.queryByText('Ya estás al día')).not.toBeInTheDocument();
    });

    it('shows both headers, splitting new items (first) from seen ones', () => {
      const newRec = newRecuerdo({ id: 'new', text: 'Recuerdo nuevo' });
      const seenRec = newRecuerdo({ id: 'seen', text: 'Recuerdo visto' });
      const items: FeedItem[] = [
        { type: 'recuerdo', createdAt: newRec.createdAt, isNew: true, recuerdo: newRec },
        { type: 'recuerdo', createdAt: seenRec.createdAt, isNew: false, recuerdo: seenRec },
      ];

      render(<FeedTab feedItems={items} />);

      const labels = screen.getAllByText(/Recuerdo nuevo|Nueva actividad|Ya estás al día|Recuerdo visto/);
      expect(labels.map((el) => el.textContent)).toEqual(['Nueva actividad', 'Recuerdo nuevo', 'Ya estás al día', 'Recuerdo visto']);
    });
  });

  it('opens the batch grid via onOpenBatchGrid when there are more photos than the preview', async () => {
    const user = userEvent.setup();
    const onOpenBatchGrid = vi.fn();
    const photoBatch = newPhotoBatch({ photoCount: 10 });
    const items: FeedItem[] = [{ type: 'photo_batch', createdAt: photoBatch.createdAt, isNew: false, photoBatch }];

    render(<FeedTab feedItems={items} onOpenBatchGrid={onOpenBatchGrid} />);
    await user.click(screen.getByRole('button', { name: /más/ }));

    expect(onOpenBatchGrid).toHaveBeenCalledWith(photoBatch);
  });

  it('opens a photo directly via onOpenBatchPhoto when a preview thumbnail is clicked', async () => {
    const user = userEvent.setup();
    const onOpenBatchPhoto = vi.fn();
    const photoBatch = newPhotoBatch();
    const items: FeedItem[] = [{ type: 'photo_batch', createdAt: photoBatch.createdAt, isNew: false, photoBatch }];

    render(<FeedTab feedItems={items} onOpenBatchPhoto={onOpenBatchPhoto} />);
    await user.click(screen.getByRole('button', { name: 'Ver foto' }));

    expect(onOpenBatchPhoto).toHaveBeenCalledWith(photoBatch, photoBatch.previewPhotos[0]);
  });

  describe('infinite scroll', () => {
    const items: FeedItem[] = [{ type: 'recuerdo', createdAt: new Date().toISOString(), isNew: false, recuerdo: newRecuerdo() }];

    beforeEach(() => {
      // See the equivalent reset in BaulFeedTabContainer.test.tsx: a test whose sentinel
      // never mounts never constructs a new IntersectionObserver, so without this reset
      // triggerIntersection could still point at an earlier test's stub.
      triggerIntersection = () => {};
    });

    it('calls onLoadMore when the sentinel intersects and hasMore is true', () => {
      stubIntersectionObserver();
      const onLoadMore = vi.fn();

      render(<FeedTab feedItems={items} onLoadMore={onLoadMore} hasMore />);
      act(() => triggerIntersection(true));

      expect(onLoadMore).toHaveBeenCalledTimes(1);
    });

    it('does not render a sentinel (nothing to intersect) once hasMore is false', () => {
      stubIntersectionObserver();
      const onLoadMore = vi.fn();

      render(<FeedTab feedItems={items} onLoadMore={onLoadMore} hasMore={false} />);
      act(() => triggerIntersection(true));

      expect(onLoadMore).not.toHaveBeenCalled();
    });

    it('does not render a sentinel when onLoadMore is not provided', () => {
      const { container } = render(<FeedTab feedItems={items} hasMore />);

      expect(container.querySelector('.h-1')).not.toBeInTheDocument();
    });

    it('shows the loading indicator while isLoadingMore is true', () => {
      const { container } = render(<FeedTab feedItems={items} onLoadMore={vi.fn()} hasMore isLoadingMore />);

      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('does not show the loading indicator while isLoadingMore is false', () => {
      const { container } = render(<FeedTab feedItems={items} onLoadMore={vi.fn()} hasMore isLoadingMore={false} />);

      expect(container.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
  });
});
