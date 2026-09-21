// @vitest-environment jsdom
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { PhotoAsset } from '@/types';
import { useMyPhotosStore } from '@/store/useMyPhotosStore';
import { MyPhotoViewerRoute } from './MyPhotoViewerRoute';

function asset(id: string, baules: { baulId: string; baulName: string }[] = []): PhotoAsset {
  return { id, thumbnailUrl: `/${id}-thumb.jpg`, fullUrl: `/${id}.jpg`, width: 100, height: 100, baules } as PhotoAsset;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/mis-fotos/foto/:assetId" element={<MyPhotoViewerRoute />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('MyPhotoViewerRoute', () => {
  beforeEach(() => {
    useMyPhotosStore.getState().reset();
  });

  // The whole point of this route: it opens the viewer purely from useMyPhotosStore, with no
  // BaulId anywhere in the URL or assumed by the container it mounts.
  it('opens the viewer for an already-loaded asset, with no baulId in the route', () => {
    useMyPhotosStore.setState({ assets: [asset('a1')], hasMore: false });

    renderAt('/mis-fotos/foto/a1');

    expect(screen.getByAltText('Foto')).toBeInTheDocument();
  });

  it('shows the baúles this asset appears in', async () => {
    useMyPhotosStore.setState({
      assets: [asset('a1', [{ baulId: 'b1', baulName: 'Familia Pardal' }, { baulId: 'b2', baulName: 'Familia Jimena' }])],
      hasMore: false,
    });
    const user = userEvent.setup();

    renderAt('/mis-fotos/foto/a1');
    // Info panel starts collapsed on mobile layout — see PhotoViewer's own doc comment. Mis
    // fotos has no recuerdos (issue #75), so this panel is labelled "Información", not
    // "Recuerdos".
    await user.click(screen.getByRole('button', { name: 'Ver información' }));

    expect(screen.getByText(/Aparece en: Familia Pardal, Familia Jimena/)).toBeInTheDocument();
  });

  it('shows a not-found message when the asset was never loaded into the gallery', () => {
    useMyPhotosStore.setState({ assets: [asset('a1')], hasMore: false });

    renderAt('/mis-fotos/foto/does-not-exist');

    expect(screen.getByText('No se ha encontrado la foto.')).toBeInTheDocument();
  });
});
