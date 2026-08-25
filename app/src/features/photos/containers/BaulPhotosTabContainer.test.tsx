// @vitest-environment jsdom
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Photo } from '@/types';
import { useBaulesStore } from '@/store/useBaulesStore';
import { usePhotosStore } from '@/store/usePhotosStore';
import { BaulPhotosTabContainer } from './BaulPhotosTabContainer';

vi.mock('react-oidc-context', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

vi.mock('@/features/photos/useCases', () => ({
  loadBaulPhotos: vi.fn(),
  loadMoreBaulPhotos: vi.fn(),
}));

import { loadBaulPhotos, loadMoreBaulPhotos } from '@/features/photos/useCases';

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

  useBaulesStore.getState().reset();
  usePhotosStore.getState().reset();
  vi.clearAllMocks();
});

const baulId = 'baul-1';

function photo(id: string): Photo {
  return { id, thumbnailUrl: `/${id}-thumb.jpg`, fullUrl: `/${id}.jpg`, recuerdoCount: 0, canDelete: true, canRequestRemoval: true } as Photo;
}

function renderContainer(overrides: Partial<React.ComponentProps<typeof BaulPhotosTabContainer>> = {}) {
  return render(
    <MemoryRouter initialEntries={[`/baules/${baulId}`]}>
      <Routes>
        <Route
          path="/baules/:baulId"
          element={
            <BaulPhotosTabContainer
              baulId={baulId}
              selectionMode={false}
              selectedIds={new Set()}
              onSelectPhoto={vi.fn()}
              onToggleSelect={vi.fn()}
              onLongPress={vi.fn()}
              onToggleGroup={vi.fn()}
              {...overrides}
            />
          }
        />
        <Route path="/baules/:baulId/fotos-sueltas/confirmar" element={<div>Confirmar subida</div>} />
      </Routes>
    </MemoryRouter>
  );
}

// El filtro "Sin capítulo" está activo por defecto y lee useBaulesStore.loosePhotos, ya
// cargado por BaulRoute/useBaulScope antes de que esta tab se monte (ver comentario de
// cabecera de BaulPhotosTabContainer) — no dispara ningún fetch propio.
describe('BaulPhotosTabContainer — filtro "Sin capítulo" (por defecto)', () => {
  it('renders the already-loaded loose photos without fetching anything', async () => {
    useBaulesStore.setState({ loosePhotos: { [baulId]: ['p1'] } });
    usePhotosStore.getState().upsertPhotos([photo('p1')]);

    renderContainer();

    expect(await screen.findByAltText('Foto')).toBeInTheDocument();
    expect(loadBaulPhotos).not.toHaveBeenCalled();
  });

  it('shows the empty state when there are no loose photos', async () => {
    useBaulesStore.setState({ loosePhotos: { [baulId]: [] } });

    renderContainer();

    expect(await screen.findByText('Todavía no hay fotos aquí')).toBeInTheDocument();
  });
});

describe('BaulPhotosTabContainer — filtro "Todas"', () => {
  async function switchToTodas() {
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Todas' }));
  }

  it('loads the first page on switching and renders it grouped by swimlane', async () => {
    useBaulesStore.setState({ loosePhotos: { [baulId]: [] } });
    vi.mocked(loadBaulPhotos).mockImplementation(async () => {
      usePhotosStore.getState().upsertPhotos([photo('p1')]);
      useBaulesStore.setState({ baulPhotos: { [baulId]: ['p1'] }, baulPhotosHasMore: { [baulId]: true } });
    });

    renderContainer();
    await switchToTodas();

    await waitFor(() => expect(loadBaulPhotos).toHaveBeenCalledWith(baulId));
    expect(await screen.findByAltText('Foto')).toBeInTheDocument();
  });

  it('shows the empty state once the first page resolves with no photos', async () => {
    useBaulesStore.setState({ loosePhotos: { [baulId]: [] } });
    vi.mocked(loadBaulPhotos).mockImplementation(async () => {
      useBaulesStore.setState({ baulPhotos: { [baulId]: [] }, baulPhotosHasMore: { [baulId]: false } });
    });

    renderContainer();
    await switchToTodas();

    expect(await screen.findByText('Todavía no hay fotos aquí')).toBeInTheDocument();
  });

  it('fetches the next page once the sentinel intersects, and stops once hasMore is false', async () => {
    useBaulesStore.setState({
      loosePhotos: { [baulId]: [] },
      baulPhotos: { [baulId]: ['p1'] },
      baulPhotosHasMore: { [baulId]: true },
    });
    usePhotosStore.getState().upsertPhotos([photo('p1')]);
    vi.mocked(loadMoreBaulPhotos).mockImplementation(async () => {
      usePhotosStore.getState().upsertPhotos([photo('p2')]);
      useBaulesStore.setState({ baulPhotos: { [baulId]: ['p1', 'p2'] }, baulPhotosHasMore: { [baulId]: false } });
    });

    renderContainer();
    await switchToTodas();
    await screen.findByAltText('Foto');

    act(() => triggerIntersection(true));
    await waitFor(() => expect(loadMoreBaulPhotos).toHaveBeenCalledWith(baulId));

    act(() => triggerIntersection(true));
    // Give any (incorrect) extra fetch a chance to fire before asserting it didn't.
    await act(async () => { await Promise.resolve(); });
    expect(loadMoreBaulPhotos).toHaveBeenCalledTimes(1);
  });

  it('shows an error state and retries when the first page fails to load', async () => {
    useBaulesStore.setState({ loosePhotos: { [baulId]: [] } });
    vi.mocked(loadBaulPhotos).mockRejectedValueOnce(new Error('network error'));

    renderContainer();
    await switchToTodas();

    expect(await screen.findByText('No se han podido cargar las fotos')).toBeInTheDocument();

    vi.mocked(loadBaulPhotos).mockImplementation(async () => {
      usePhotosStore.getState().upsertPhotos([photo('p1')]);
      useBaulesStore.setState({ baulPhotos: { [baulId]: ['p1'] }, baulPhotosHasMore: { [baulId]: false } });
    });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByAltText('Foto')).toBeInTheDocument();
  });
});

describe('BaulPhotosTabContainer', () => {
  it('navigates to the loose-photos upload flow from the FAB', async () => {
    useBaulesStore.setState({ loosePhotos: { [baulId]: ['p1'] } });
    usePhotosStore.getState().upsertPhotos([photo('p1')]);

    const user = userEvent.setup();
    renderContainer();
    await screen.findByAltText('Foto');
    await user.click(screen.getByText('Subir fotos'));

    expect(screen.getByText('Confirmar subida')).toBeInTheDocument();
  });

  it('hides the upload FAB and the filter pills while in selection mode', async () => {
    useBaulesStore.setState({ loosePhotos: { [baulId]: ['p1'] } });
    usePhotosStore.getState().upsertPhotos([photo('p1')]);

    renderContainer({ selectionMode: true, selectedIds: new Set(['p1']) });
    await screen.findByAltText('Foto');

    expect(screen.queryByText('Subir fotos')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Todas' })).not.toBeInTheDocument();
  });
});
