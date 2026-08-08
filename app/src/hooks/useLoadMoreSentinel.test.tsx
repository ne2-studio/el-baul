// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { useLoadMoreSentinel } from '@/hooks/useLoadMoreSentinel';

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

function Sentinel({ loadMore, remountKey }: { loadMore: () => void; remountKey: unknown }) {
  const ref = useLoadMoreSentinel(loadMore, remountKey);
  return <div ref={ref} data-testid="sentinel" />;
}

describe('useLoadMoreSentinel', () => {
  it('calls loadMore when the sentinel intersects', () => {
    stubIntersectionObserver();
    const loadMore = vi.fn();
    render(<Sentinel loadMore={loadMore} remountKey={1} />);

    act(() => triggerIntersection(true));

    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it('does not call loadMore when the sentinel is not intersecting', () => {
    stubIntersectionObserver();
    const loadMore = vi.fn();
    render(<Sentinel loadMore={loadMore} remountKey={1} />);

    act(() => triggerIntersection(false));

    expect(loadMore).not.toHaveBeenCalled();
  });

  it('re-subscribes when remountKey changes', () => {
    stubIntersectionObserver();
    const loadMore = vi.fn();
    const { rerender } = render(<Sentinel loadMore={loadMore} remountKey={1} />);
    rerender(<Sentinel loadMore={loadMore} remountKey={2} />);

    act(() => triggerIntersection(true));

    expect(loadMore).toHaveBeenCalledTimes(1);
  });
});
