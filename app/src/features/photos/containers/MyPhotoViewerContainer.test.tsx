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

import { addPhotoAssetToBaul } from '@/features/photos/useCases/sharing';

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

  it('does not offer "Añadir a otro baúl" when there are no other accessible baúles', () => {
    useBaulesStore.setState({ baules: [baul('b1', 'Familia Pardal')] });

    render(
      <MyPhotoViewerContainer
        photo={asset('a1', [{ baulId: 'b1', baulName: 'Familia Pardal' }])}
        photos={[]}
        onClose={vi.fn()}
        onPhotoChange={vi.fn()}
      />
    );

    // Sin acciones que ofrecer, PhotoViewerHeader ni siquiera pinta el botón "···".
    expect(screen.queryByRole('button', { name: 'Más opciones' })).not.toBeInTheDocument();
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
