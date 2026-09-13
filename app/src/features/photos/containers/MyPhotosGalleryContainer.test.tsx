// @vitest-environment jsdom
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PhotoAsset } from '@/types';
import { useMyPhotosStore } from '@/store/useMyPhotosStore';
import { MyPhotosGalleryContainer } from './MyPhotosGalleryContainer';

vi.mock('react-oidc-context', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

vi.mock('@/features/photos/useCases', () => ({
  loadMyPhotos: vi.fn(),
  loadMoreMyPhotos: vi.fn(),
}));

import { loadMoreMyPhotos, loadMyPhotos } from '@/features/photos/useCases';

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

  useMyPhotosStore.getState().reset();
  vi.clearAllMocks();
});

function asset(id: string, baules: { baulId: string; baulName: string }[] = []): PhotoAsset {
  return { id, thumbnailUrl: `/${id}-thumb.jpg`, fullUrl: `/${id}.jpg`, width: 100, height: 100, baules } as PhotoAsset;
}

function renderContainer() {
  return render(
    <MemoryRouter initialEntries={['/mis-fotos']}>
      <Routes>
        <Route path="/mis-fotos" element={<MyPhotosGalleryContainer />} />
        <Route path="/mis-fotos/foto/:assetId" element={<div>Foto abierta</div>} />
        <Route path="/mis-fotos/subir/confirmar" element={<div>Confirmar subida</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('MyPhotosGalleryContainer', () => {
  it('loads the first page on entry and renders it', async () => {
    vi.mocked(loadMyPhotos).mockImplementation(async () => {
      useMyPhotosStore.setState({ assets: [asset('a1')], hasMore: true });
    });

    renderContainer();

    await waitFor(() => expect(loadMyPhotos).toHaveBeenCalled());
    expect(await screen.findByAltText('Foto')).toBeInTheDocument();
  });

  it('shows a spinner on entry while the first page is in flight', async () => {
    vi.mocked(loadMyPhotos).mockImplementation(() => new Promise(() => {}));

    renderContainer();

    expect(await screen.findByText('Cargando tus fotos...')).toBeInTheDocument();
  });

  it('shows the empty state once the first page resolves with no assets', async () => {
    vi.mocked(loadMyPhotos).mockImplementation(async () => {
      useMyPhotosStore.setState({ assets: [], hasMore: false });
    });

    renderContainer();

    expect(await screen.findByText('Tus fotos pueden empezar aquí')).toBeInTheDocument();
  });

  it('fetches the next page once the sentinel intersects, and stops once hasMore is false', async () => {
    useMyPhotosStore.setState({ assets: [asset('a1')], hasMore: true });
    vi.mocked(loadMoreMyPhotos).mockImplementation(async () => {
      useMyPhotosStore.setState({ assets: [asset('a1'), asset('a2')], hasMore: false });
    });

    renderContainer();
    await screen.findByAltText('Foto');

    triggerIntersection(true);
    await waitFor(() => expect(loadMoreMyPhotos).toHaveBeenCalled());
  });

  it('shows an error state and retries when the first page fails to load', async () => {
    vi.mocked(loadMyPhotos).mockRejectedValueOnce(new Error('network error'));

    renderContainer();

    expect(await screen.findByText('No se han podido cargar tus fotos')).toBeInTheDocument();

    vi.mocked(loadMyPhotos).mockImplementation(async () => {
      useMyPhotosStore.setState({ assets: [asset('a1')], hasMore: false });
    });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByAltText('Foto')).toBeInTheDocument();
  });

  // Dedupe itself is a backend guarantee (see MyPhotosReadManagerTests on the API side) — this
  // only pins that opening one of two already-deduplicated assets works with no BaulId anywhere
  // in the URL, unlike every other photo viewer route.
  it('opens the viewer for an asset with no baulId in the route', async () => {
    useMyPhotosStore.setState({ assets: [asset('a1'), asset('a2')], hasMore: false });
    const user = userEvent.setup();

    renderContainer();
    const photos = await screen.findAllByAltText('Foto');
    await user.click(photos[0]);

    expect(await screen.findByText('Foto abierta')).toBeInTheDocument();
  });

  // Slice 3 (docs/.backlog issue #62): "Sin compartir" filter + upload FAB.
  it('switching to "Sin compartir" resets the page and re-fetches with that filter', async () => {
    useMyPhotosStore.setState({ assets: [asset('a1')], hasMore: false, filter: 'todas' });
    vi.mocked(loadMyPhotos).mockImplementation(async () => {
      useMyPhotosStore.setState({ assets: [], hasMore: false });
    });
    const user = userEvent.setup();

    renderContainer();
    await screen.findByAltText('Foto');

    await user.click(screen.getByRole('button', { name: 'Sin compartir' }));

    expect(useMyPhotosStore.getState().filter).toBe('sin-compartir');
    await waitFor(() => expect(loadMyPhotos).toHaveBeenCalled());
    expect(await screen.findByText('Todo está compartido')).toBeInTheDocument();
  });

  it('navigates to the Mis fotos upload flow when the FAB is clicked', async () => {
    useMyPhotosStore.setState({ assets: [], hasMore: false });
    const user = userEvent.setup();

    renderContainer();
    await screen.findByText('Tus fotos pueden empezar aquí');
    await user.click(screen.getByRole('button', { name: 'Subir fotos' }));

    expect(await screen.findByText('Confirmar subida')).toBeInTheDocument();
  });

  // Multi-selection (Slice 5, docs/.backlog issue #62) reuses PhotoSwimlanes' existing
  // selection primitives — same selectionMode/selectedIds/onToggleSelect shape BaulRoute already
  // passes to BaulPhotosTabContainer.
  it('hides the filter pills and the upload FAB while in selection mode', async () => {
    useMyPhotosStore.setState({ assets: [asset('a1')], hasMore: false });

    render(
      <MemoryRouter initialEntries={['/mis-fotos']}>
        <MyPhotosGalleryContainer selectionMode selectedIds={new Set(['a1'])} onToggleSelect={vi.fn()} onLongPress={vi.fn()} />
      </MemoryRouter>
    );
    await screen.findByAltText('Foto');

    expect(screen.queryByRole('button', { name: 'Todas' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Subir fotos' })).not.toBeInTheDocument();
  });

  it('toggles selection instead of opening the viewer while in selection mode', async () => {
    useMyPhotosStore.setState({ assets: [asset('a1')], hasMore: false });
    const onToggleSelect = vi.fn();
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/mis-fotos']}>
        <MyPhotosGalleryContainer selectionMode selectedIds={new Set()} onToggleSelect={onToggleSelect} onLongPress={vi.fn()} />
      </MemoryRouter>
    );
    await user.click(await screen.findByAltText('Foto'));

    expect(onToggleSelect).toHaveBeenCalledWith('a1');
  });
});
