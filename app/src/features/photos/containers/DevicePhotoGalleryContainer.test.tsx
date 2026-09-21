// @vitest-environment jsdom
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DevicePhoto } from '@/features/photos/native/devicePhotos';
import { useDevicePhotosStore } from '@/store/useDevicePhotosStore';
import { DevicePhotoGalleryContainer } from './DevicePhotoGalleryContainer';

vi.mock('react-oidc-context', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

vi.mock('@/features/photos/native/devicePhotos', async () => {
  const actual = await vi.importActual<typeof import('@/features/photos/native/devicePhotos')>('@/features/photos/native/devicePhotos');
  return { ...actual, isDevicePhotosSupported: vi.fn(() => true) };
});

vi.mock('@/features/photos/useCases', () => ({
  ensureDevicePhotosPermission: vi.fn(),
  loadDevicePhotos: vi.fn(),
  loadMoreDevicePhotos: vi.fn(),
}));

import { isDevicePhotosSupported } from '@/features/photos/native/devicePhotos';
import { ensureDevicePhotosPermission, loadDevicePhotos, loadMoreDevicePhotos } from '@/features/photos/useCases';

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

  useDevicePhotosStore.getState().reset();
  vi.mocked(isDevicePhotosSupported).mockReturnValue(true);
  vi.clearAllMocks();
  vi.mocked(isDevicePhotosSupported).mockReturnValue(true);
});

function photo(id: string): DevicePhoto {
  return { id, thumbnailUrl: `/${id}-thumb.jpg`, fullUrl: `/${id}-thumb.jpg`, width: 100, height: 100 } as DevicePhoto;
}

function renderContainer() {
  return render(
    <MemoryRouter initialEntries={['/en-este-dispositivo']}>
      <DevicePhotoGalleryContainer />
    </MemoryRouter>
  );
}

describe('DevicePhotoGalleryContainer', () => {
  it('shows a not-supported empty state off Android native', () => {
    vi.mocked(isDevicePhotosSupported).mockReturnValue(false);

    renderContainer();

    expect(screen.getByText('Solo disponible en la app de Android')).toBeInTheDocument();
    expect(ensureDevicePhotosPermission).not.toHaveBeenCalled();
  });

  it('requests permission on entry, then loads the first page once granted', async () => {
    vi.mocked(ensureDevicePhotosPermission).mockImplementation(async () => {
      useDevicePhotosStore.getState().setPermission('granted');
      return true;
    });
    vi.mocked(loadDevicePhotos).mockImplementation(async () => {
      useDevicePhotosStore.setState({ photos: [photo('p1')], hasMore: false });
    });

    renderContainer();

    await waitFor(() => expect(loadDevicePhotos).toHaveBeenCalled());
    expect(await screen.findByAltText('Foto')).toBeInTheDocument();
  });

  it('shows a denial state with a retry action when permission is denied', async () => {
    vi.mocked(ensureDevicePhotosPermission).mockImplementation(async () => {
      useDevicePhotosStore.getState().setPermission('denied');
      return false;
    });

    renderContainer();

    expect(await screen.findByText('Sin acceso a tus fotos')).toBeInTheDocument();
    expect(loadDevicePhotos).not.toHaveBeenCalled();

    vi.mocked(ensureDevicePhotosPermission).mockImplementation(async () => {
      useDevicePhotosStore.getState().setPermission('granted');
      return true;
    });
    vi.mocked(loadDevicePhotos).mockImplementation(async () => {
      useDevicePhotosStore.setState({ photos: [], hasMore: false });
    });

    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('No hay fotos en este dispositivo')).toBeInTheDocument();
  });

  it('fetches the next page once the sentinel intersects, and stops once hasMore is false', async () => {
    useDevicePhotosStore.setState({ permission: 'granted', photos: [photo('p1')], hasMore: true });
    vi.mocked(loadMoreDevicePhotos).mockImplementation(async () => {
      useDevicePhotosStore.setState({ photos: [photo('p1'), photo('p2')], hasMore: false });
    });

    renderContainer();
    await screen.findByAltText('Foto');

    triggerIntersection(true);
    await waitFor(() => expect(loadMoreDevicePhotos).toHaveBeenCalled());
  });
});
