import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// React Router doesn't reset scroll on navigation (unlike full page loads), so without
// this every route mounts wherever the previous page happened to be scrolled to.
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
