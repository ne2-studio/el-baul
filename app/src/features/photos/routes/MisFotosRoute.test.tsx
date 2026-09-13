// @vitest-environment jsdom
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Baul } from '@/types';
import { MisFotosRoute } from './MisFotosRoute';

vi.mock('@/features/baules/containers/WorkspaceSwitcherContainer', () => ({
  WorkspaceSwitcherContainer: ({ activeBaul }: { activeBaul: Baul | null }) => (
    <div data-testid="switcher">{activeBaul ? activeBaul.name : 'no-baul'}</div>
  ),
}));
vi.mock('@/features/baules/containers/BaulSettingsMenuContainer', () => ({
  BaulSettingsMenuContainer: ({ baul }: { baul?: Baul }) => <div data-testid="settings">{baul ? baul.id : 'no-baul'}</div>,
}));
vi.mock('@/features/photos/containers/MyPhotosGalleryContainer', () => ({
  MyPhotosGalleryContainer: () => <div>Galería de mis fotos</div>,
}));

function renderRoute() {
  return render(
    <MemoryRouter initialEntries={['/mis-fotos']}>
      <Routes>
        <Route path="/mis-fotos" element={<MisFotosRoute />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('MisFotosRoute', () => {
  it('renders the switcher and settings menu with no selected baúl', () => {
    renderRoute();

    expect(screen.getByTestId('switcher')).toHaveTextContent('no-baul');
    expect(screen.getByTestId('settings')).toHaveTextContent('no-baul');
  });

  it('renders the gallery', () => {
    renderRoute();

    expect(screen.getByText('Galería de mis fotos')).toBeInTheDocument();
  });

  // The whole point of this screen not being a baúl: no Historia/Fotos/Capítulos/Familia tabs.
  it('renders no baúl-specific navigation tabs', () => {
    renderRoute();

    for (const tab of ['Historia', 'Fotos', 'Capítulos', 'Familia']) {
      expect(screen.queryByText(tab)).not.toBeInTheDocument();
    }
  });
});
