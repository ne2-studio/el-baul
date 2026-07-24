import { useEffect, useState } from 'react';

/**
 * Sigue el visualViewport del navegador para overlays con position:fixed — en iOS
 * Safari el teclado no reduce el layout viewport (el que usan inset-0/vh), solo
 * visualViewport, así que sin esto la parte inferior de los modales queda tapada.
 */
export function useVisualViewportInset() {
  const [inset, setInset] = useState({ top: 0, height: window.innerHeight });

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setInset({ top: vv.offsetTop, height: vv.height });
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return inset;
}
