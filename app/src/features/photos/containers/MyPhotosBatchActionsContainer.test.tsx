// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Baul } from '@/types';
import { useBaulesStore } from '@/store/useBaulesStore';
import { useUIStore } from '@/store/uiStore';
import { MyPhotosBatchActionsContainer } from './MyPhotosBatchActionsContainer';

vi.mock('@/features/photos/useCases', () => ({
  removePhotosFromMyPhotos: vi.fn(),
  addPhotoAssetsToBaulBatch: vi.fn(),
}));

import { removePhotosFromMyPhotos, addPhotoAssetsToBaulBatch } from '@/features/photos/useCases';

function baul(id: string, name: string): Baul {
  return { id, name } as Baul;
}

describe('MyPhotosBatchActionsContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUIStore.setState({ toastMessage: '', showToast: false });
    useBaulesStore.setState({ baules: [baul('b1', 'Familia Pardal')] });
  });

  it('removes the selected assets from Mis fotos after confirming', async () => {
    vi.mocked(removePhotosFromMyPhotos).mockResolvedValue(undefined);
    const onDone = vi.fn();
    const user = userEvent.setup();

    render(<MyPhotosBatchActionsContainer active selectedIds={new Set(['a1', 'a2'])} onDone={onDone} />);
    await user.click(screen.getByRole('button', { name: /quitar 2 fotos/i }));
    await user.click(screen.getByRole('button', { name: 'Sí, quitar' }));

    await waitFor(() => expect(removePhotosFromMyPhotos).toHaveBeenCalledWith(['a1', 'a2']));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it('does not remove anything if the confirmation is cancelled', async () => {
    const user = userEvent.setup();

    render(<MyPhotosBatchActionsContainer active selectedIds={new Set(['a1'])} onDone={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /quitar 1 foto/i }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(removePhotosFromMyPhotos).not.toHaveBeenCalled();
  });

  it('adds the selected assets to the chosen baúl', async () => {
    vi.mocked(addPhotoAssetsToBaulBatch).mockResolvedValue(undefined);
    const onDone = vi.fn();
    const user = userEvent.setup();

    render(<MyPhotosBatchActionsContainer active selectedIds={new Set(['a1'])} onDone={onDone} />);
    await user.click(screen.getByRole('button', { name: /añadir a un baúl/i }));
    await user.click(screen.getByText('Familia Pardal'));
    await user.click(screen.getByRole('button', { name: /^añadir$/i }));

    await waitFor(() => expect(addPhotoAssetsToBaulBatch).toHaveBeenCalledWith(['a1'], 'b1'));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it('offers no "Añadir a un baúl" action when there are no baúles at all', () => {
    useBaulesStore.setState({ baules: [] });

    render(<MyPhotosBatchActionsContainer active selectedIds={new Set(['a1'])} onDone={vi.fn()} />);

    expect(screen.queryByRole('button', { name: /añadir a un baúl/i })).not.toBeInTheDocument();
  });
});
