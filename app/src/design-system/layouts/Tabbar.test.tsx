// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import { Tabbar } from './Tabbar';

// Envuelve Tabbar con el mismo patrón controlado que usan BaulRoute/ChapterRoute/
// PersonaDetailRoute: `active` en un useState del padre, cambiado vía onChange.
function ControlledTabbar() {
  const [active, setActive] = useState('a');
  return (
    <Tabbar
      tabs={[{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }]}
      active={active}
      onChange={setActive}
    >
      <div>Contenido de {active}</div>
    </Tabbar>
  );
}

describe('Tabbar scroll memory', () => {
  beforeEach(() => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true });
  });

  it('scrolls to top the first time a tab is visited, and restores each tab\'s own scroll on return', () => {
    render(<ControlledTabbar />);

    // Primer montaje: pestaña "A" arriba.
    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 0);

    // El usuario baja en "A"...
    Object.defineProperty(window, 'scrollY', { value: 300, configurable: true });

    // ...y cambia a "B", que nunca se ha visitado: debe aparecer arriba, no a mitad de "A".
    fireEvent.click(screen.getByText('B'));
    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 0);

    // El usuario baja en "B"...
    Object.defineProperty(window, 'scrollY', { value: 500, configurable: true });

    // ...y vuelve a "A": debe retomar exactamente donde lo dejó, no donde estaba "B".
    fireEvent.click(screen.getByText('A'));
    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 300);
  });
});
