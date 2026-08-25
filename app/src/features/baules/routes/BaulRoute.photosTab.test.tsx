// @vitest-environment jsdom
// Cubre el cableado nuevo de la pestaña "Fotos" (issue #57): que aparece en el Tabbar, que la
// selección múltiple sustituye el header compartido (icono de ajustes -> contador + "Cancelar"),
// y que la barra de acciones en lote se activa solo mientras esa pestaña está en modo de
// selección — no repite aquí la cobertura de paginación/scroll infinito, ya cubierta en
// BaulPhotosTabContainer.test.tsx.
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Baul, Photo } from '@/types';
import { useBaulesStore } from '@/store/useBaulesStore';
import { usePhotosStore } from '@/store/usePhotosStore';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { usePersonasStore } from '@/store/usePersonasStore';
import { useUIStore } from '@/store/uiStore';
import { BaulRoute } from './BaulRoute';

vi.mock('react-oidc-context', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub);

class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);

vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

vi.mock('@/features/baules/containers/WorkspaceSwitcherContainer', () => ({
  WorkspaceSwitcherContainer: () => <div>Selector de baúl</div>,
}));
vi.mock('@/features/baules/containers/BaulSettingsMenuContainer', () => ({
  BaulSettingsMenuContainer: () => <div>Ajustes</div>,
}));
vi.mock('@/features/contributions/containers/ContributionSuggestionGateContainer', () => ({
  ContributionSuggestionGateContainer: () => null,
}));
vi.mock('@/features/memories/containers/BaulFeedTabContainer', () => ({
  BaulFeedTabContainer: () => <div>Contenido de Historia</div>,
}));
vi.mock('@/features/baules/containers/BaulChaptersTabContainer', () => ({
  BaulChaptersTabContainer: () => <div>Contenido de Capítulos</div>,
}));
vi.mock('@/features/people/containers/BaulPersonasTabContainer', () => ({
  BaulPersonasTabContainer: () => <div>Contenido de Familia</div>,
}));

const baul = { id: 'baul-1', name: 'Familia García', chapterCount: 0, role: 'administrador' } as Baul;

const photo1 = { id: 'p1', thumbnailUrl: '/p1-thumb.jpg', fullUrl: '/p1.jpg', recuerdoCount: 0, canDelete: true, canRequestRemoval: true } as Photo;

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/baules/:baulId" element={<BaulRoute />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('BaulRoute — pestaña Fotos', () => {
  beforeEach(() => {
    useBaulesStore.setState({
      baules: [baul],
      chapters: { [baul.id]: [] },
      photos: {},
      loosePhotos: { [baul.id]: [] },
      baulPhotos: { [baul.id]: [photo1.id] },
      baulPhotosHasMore: { [baul.id]: false },
      isLoading: false,
    });
    usePhotosStore.setState({ photosById: { [photo1.id]: photo1 } });
    useRecuerdosStore.setState({ baulRecuerdos: { [baul.id]: [] }, chapterRecuerdos: {} });
    usePersonasStore.setState({ personas: { [baul.id]: [] } });
    useUIStore.setState({ isFirstAppLaunch: true });
  });

  it('lists the four tabs in order: Historia, Fotos, Capítulos, Familia', async () => {
    renderAt(`/baules/${baul.id}`);
    await screen.findByText('Contenido de Historia');

    const tabs = screen.getAllByRole('button').map((b) => b.textContent).filter((t) =>
      ['Historia', 'Fotos', 'Capítulos', 'Familia'].includes(t ?? '')
    );
    expect(tabs).toEqual(['Historia', 'Fotos', 'Capítulos', 'Familia']);
  });

  it('renders the photo grid on the Fotos tab', async () => {
    const user = userEvent.setup();
    renderAt(`/baules/${baul.id}`);
    await screen.findByText('Contenido de Historia');

    await user.click(screen.getByRole('button', { name: 'Fotos' }));

    expect(await screen.findByAltText('Foto')).toBeInTheDocument();
  });

  it('long-pressing a photo swaps the header for "Cancelar" and a selection count', async () => {
    const user = userEvent.setup();
    renderAt(`/baules/${baul.id}`);
    await screen.findByText('Contenido de Historia');
    await user.click(screen.getByRole('button', { name: 'Fotos' }));
    await screen.findByAltText('Foto');

    // El checkbox de selección siempre está en el DOM (opacity-0 hasta hover/selección) —
    // clicarlo entra en modo de selección igual que un long-press, ver PhotoSwimlanes.
    await user.click(screen.getByRole('checkbox', { name: 'Seleccionar foto' }));

    expect(await screen.findByText('1 seleccionada')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    expect(screen.queryByText('Ajustes')).not.toBeInTheDocument();
    expect(screen.queryByText('Selector de baúl')).not.toBeInTheDocument();
  });

  it('"Cancelar" exits selection mode and restores the normal header', async () => {
    const user = userEvent.setup();
    renderAt(`/baules/${baul.id}`);
    await screen.findByText('Contenido de Historia');
    await user.click(screen.getByRole('button', { name: 'Fotos' }));
    await screen.findByAltText('Foto');
    await user.click(screen.getByRole('checkbox', { name: 'Seleccionar foto' }));
    await screen.findByText('1 seleccionada');

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(await screen.findByText('Ajustes')).toBeInTheDocument();
    expect(screen.getByText('Selector de baúl')).toBeInTheDocument();
  });

  it('offers Borrar but not Mover/Crear capítulo from the batch action bar', async () => {
    const user = userEvent.setup();
    renderAt(`/baules/${baul.id}`);
    await screen.findByText('Contenido de Historia');
    await user.click(screen.getByRole('button', { name: 'Fotos' }));
    await screen.findByAltText('Foto');
    await user.click(screen.getByRole('checkbox', { name: 'Seleccionar foto' }));
    await screen.findByText('1 seleccionada');

    expect(screen.getByRole('button', { name: 'Borrar 1 foto' })).toBeInTheDocument();
    expect(screen.queryByText('Mover')).not.toBeInTheDocument();
    expect(screen.queryByText('Crear capítulo')).not.toBeInTheDocument();
  });
});
