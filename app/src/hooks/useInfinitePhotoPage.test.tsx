// @vitest-environment jsdom
import { act, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Photo } from '@/types';
import { useInfinitePhotoPage } from '@/hooks/useInfinitePhotoPage';

function makePhotos(prefix: string, count: number): Photo[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i}`,
    thumbnailUrl: `/${prefix}-${i}-thumb.jpg`,
    fullUrl: `/${prefix}-${i}.jpg`,
    recuerdoCount: 0,
    canDelete: false,
    canRequestRemoval: true,
  }));
}

let triggerIntersection: (isIntersecting: boolean) => void = () => {};

beforeEach(() => {
  class TestIntersectionObserver {
    constructor(callback: IntersectionObserverCallback) {
      triggerIntersection = (isIntersecting: boolean) =>
        callback([{ isIntersecting } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
    }
    observe = vi.fn();
    disconnect = vi.fn();
  }
  vi.stubGlobal('IntersectionObserver', TestIntersectionObserver);
});

function Harness({ fetchPage }: { fetchPage: Parameters<typeof useInfinitePhotoPage>[0] }) {
  const { photos, isLoading, isInitialLoad, sentinelRef } = useInfinitePhotoPage(fetchPage);
  return (
    <div>
      <span data-testid="state">{JSON.stringify({ count: photos.length, isLoading, isInitialLoad })}</span>
      <div ref={sentinelRef} data-testid="sentinel" />
    </div>
  );
}

describe('useInfinitePhotoPage', () => {
  it('loads the first page on mount with skip 0, then accumulates subsequent pages via the sentinel', async () => {
    const firstPage = makePhotos('a', 2);
    const secondPage = makePhotos('b', 2);
    const fetchPage = vi.fn()
      .mockResolvedValueOnce({ photos: firstPage, hasMore: true })
      .mockResolvedValueOnce({ photos: secondPage, hasMore: false });

    const { getByTestId } = render(<Harness fetchPage={fetchPage} />);

    await waitFor(() => expect(fetchPage).toHaveBeenNthCalledWith(1, 0, 60));
    await waitFor(() => expect(getByTestId('state').textContent).toContain('"count":2'));
    expect(fetchPage).toHaveBeenCalledTimes(1);

    act(() => triggerIntersection(true));

    await waitFor(() => expect(fetchPage).toHaveBeenNthCalledWith(2, 2, 60));
    await waitFor(() => expect(getByTestId('state').textContent).toContain('"count":4'));
  });

  it('does not request another page once hasMore is false, even if the sentinel fires again', async () => {
    const onlyPage = makePhotos('a', 1);
    const fetchPage = vi.fn().mockResolvedValue({ photos: onlyPage, hasMore: false });

    render(<Harness fetchPage={fetchPage} />);

    await waitFor(() => expect(fetchPage).toHaveBeenCalledTimes(1));

    act(() => triggerIntersection(true));
    act(() => triggerIntersection(true));

    await act(async () => {
      await Promise.resolve();
    });
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('ignores a sentinel intersection while a page is already in flight', async () => {
    let resolveFirst!: (page: { photos: Photo[]; hasMore: boolean }) => void;
    const fetchPage = vi.fn().mockImplementation(
      () => new Promise((resolve) => { resolveFirst = resolve; })
    );

    render(<Harness fetchPage={fetchPage} />);

    await waitFor(() => expect(fetchPage).toHaveBeenCalledTimes(1));

    act(() => triggerIntersection(true));
    await act(async () => {
      await Promise.resolve();
    });
    expect(fetchPage).toHaveBeenCalledTimes(1);

    act(() => resolveFirst({ photos: makePhotos('a', 1), hasMore: false }));
    await waitFor(() => expect(fetchPage).toHaveBeenCalledTimes(1));
  });
});
