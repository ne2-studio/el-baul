import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Measures an element's real rendered height instead of assuming a fixed
 * pixel value — WKWebView (iOS) and Chrome WebView (Android) render the same
 * markup at slightly different heights, which broke sticky offsets that
 * hardcoded the header's height.
 */
export function useElementHeight<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;

    // getBoundingClientRect (border-box), not entry.contentRect (content-box only) — the
    // header's bottom border is part of the space the next sticky element must clear.
    const observer = new ResizeObserver(([entry]) => {
      setHeight(entry.target.getBoundingClientRect().height);
    });
    observer.observe(node);
    setHeight(node.getBoundingClientRect().height);

    return () => observer.disconnect();
  }, []);

  return [ref, height];
}
