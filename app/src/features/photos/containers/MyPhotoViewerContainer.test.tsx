// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Baul, PhotoAsset } from '@/types';
import { useBaulesStore } from '@/store/useBaulesStore';
import { useUIStore } from '@/store/uiStore';
import { MyPhotoViewerContainer } from './MyPhotoViewerContainer';

vi.mock('@/features/photos/useCases/sharing', () => ({
  addPhotoAssetToBaul: vi.fn(),
}));

vi.mock('@/features/photos/useCases/personalCollection', () => ({
  removeFromMyPhotos: vi.fn(),
}));

import { addPhotoAssetToBaul } from '@/features/photos/useCases/sharing';
import { removeFromMyPhotos } from '@/features/photos/useCases/personalCollection';

function asset(id: string, baules: { baulId: string; baulName: string }[] = []): PhotoAsset {
  return { id, thumbnailUrl: `/${id}-thumb.jpg`, fullUrl: `/${id}.jpg`, width: 100, height: 100, baules } as PhotoAsset;
}

function baul(id: string, name: string): Baul {
  return { id, name } as Baul;
}

async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Más opciones' }));
}

describe('MyPhotoViewerContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUIStore.setState({ toastMessage: '', showToast: false });
  });

  it('does not offer "Añadir a otro baúl" when there are no other accessible baúles', async () => {
    useBaulesStore.setState({ baules: [baul('b1', 'Familia Pardal')] });
    const user = userEvent.setup();

    render(
      <MyPhotoViewerContainer
        photo={asset('a1', [{ baulId: 'b1', baulName: 'Familia Pardal' }])}
        photos={[]}
        onClose={vi.fn()}
        onPhotoChange={vi.fn()}
      />
    );

    // "Quitar de Mis fotos" (Slice 5) siempre está disponible, así que el botón "···" sigue
    // pintándose — solo "Añadir a otro baúl" desaparece al no haber baúles accesibles.
    await openMenu(user);
    expect(screen.queryByText('Añadir a otro baúl')).not.toBeInTheDocument();
    expect(screen.getByText('Quitar de Mis fotos')).toBeInTheDocument();
  });

  it('removes the asset from Mis fotos and closes the viewer', async () => {
    useBaulesStore.setState({ baules: [] });
    vi.mocked(removeFromMyPhotos).mockResolvedValue(undefined);
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <MyPhotoViewerContainer
        photo={asset('a1', [{ baulId: 'b1', baulName: 'Familia Pardal' }])}
        photos={[]}
        onClose={onClose}
        onPhotoChange={vi.fn()}
      />
    );
    await openMenu(user);
    await user.click(screen.getByText('Quitar de Mis fotos'));
    await user.click(screen.getByRole('button', { name: 'Sí, quitar' }));

    await waitFor(() => expect(removeFromMyPhotos).toHaveBeenCalledWith('a1'));
    expect(onClose).toHaveBeenCalled();
  });

  it('offers, and adds the asset to, a baúl it does not yet appear in', async () => {
    useBaulesStore.setState({
      baules: [baul('b1', 'Familia Pardal'), baul('b2', 'Familia Jimena')],
    });
    vi.mocked(addPhotoAssetToBaul).mockResolvedValue({ baulId: 'b2', baulName: 'Familia Jimena' });
    const user = userEvent.setup();

    render(
      <MyPhotoViewerContainer
        photo={asset('a1', [{ baulId: 'b1', baulName: 'Familia Pardal' }])}
        photos={[]}
        onClose={vi.fn()}
        onPhotoChange={vi.fn()}
      />
    );
    await openMenu(user);
    await user.click(screen.getByText('Añadir a otro baúl'));
    await user.click(screen.getByText('Familia Jimena'));
    await user.click(screen.getByRole('button', { name: 'Añadir' }));

    await waitFor(() => expect(addPhotoAssetToBaul).toHaveBeenCalledWith('a1', 'b2'));
    // Cierra el modal, pero no navega ni cierra el visor — el usuario sigue en Mis fotos.
    await waitFor(() => expect(screen.queryByText('Familia Jimena', { selector: 'h2' })).not.toBeInTheDocument());
    expect(useUIStore.getState().toastMessage).toBe('Foto añadida al baúl');
  });
});
