// @vitest-environment jsdom
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { DevicePhoto } from '@/features/photos/native/devicePhotos';
import { useDevicePhotosStore } from '@/store/useDevicePhotosStore';
import { DevicePhotoViewerRoute } from './DevicePhotoViewerRoute';

function photo(id: string): DevicePhoto {
  return { id, thumbnailUrl: `/${id}-thumb.jpg`, fullUrl: `/${id}.jpg`, width: 100, height: 100 } as DevicePhoto;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/en-este-dispositivo/:albumId/foto/:photoId" element={<DevicePhotoViewerRoute />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('DevicePhotoViewerRoute', () => {
  beforeEach(() => {
    useDevicePhotosStore.getState().reset();
  });

  it('opens the viewer for an already-loaded device photo', () => {
    useDevicePhotosStore.setState({ photos: [photo('p1')], hasMore: false });

    renderAt('/en-este-dispositivo/album-1/foto/p1');

    expect(screen.getByAltText('Foto')).toBeInTheDocument();
  });

  it('shows a not-found message when the photo was never loaded into the gallery', () => {
    useDevicePhotosStore.setState({ photos: [photo('p1')], hasMore: false });

    renderAt('/en-este-dispositivo/album-1/foto/does-not-exist');

    expect(screen.getByText('No se ha encontrado la foto.')).toBeInTheDocument();
  });
});
