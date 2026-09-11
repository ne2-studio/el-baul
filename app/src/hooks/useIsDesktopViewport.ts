import { useEffect, useState } from 'react';

// Mirrors Tailwind's `md` breakpoint (768px width) but also requires enough height. A phone
// rotated to landscape can cross 768px in width while staying short (e.g. ~414px tall) — without
// the height check it would be mistaken for a tablet/desktop viewport. Real tablets/desktops are
// wide *and* tall, so this extra condition doesn't affect them.
const DESKTOP_QUERY = '(min-width: 768px) and (min-height: 600px)';

function matchesDesktopQuery() {
  return typeof window !== 'undefined' && window.matchMedia(DESKTOP_QUERY).matches;
}

/**
 * Whether the viewport is desktop/tablet-sized (wide AND tall), as opposed to just wide — which
 * a phone in landscape can be too. Use this instead of Tailwind's `md:` classes wherever a
 * layout switch should be driven by "is this actually a bigger screen" rather than raw width,
 * so that rotating a phone to landscape can't accidentally flip it into a desktop layout.
 */
export function useIsDesktopViewport() {
  const [isDesktop, setIsDesktop] = useState(matchesDesktopQuery);

  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY);
    const update = () => setIsDesktop(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  return isDesktop;
}
