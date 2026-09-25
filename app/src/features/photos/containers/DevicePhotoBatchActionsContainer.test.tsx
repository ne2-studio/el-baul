// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DevicePhoto } from '@/features/photos/native/devicePhotos';
import { useDevicePhotosStore } from '@/store/useDevicePhotosStore';
import { useUIStore } from '@/store/uiStore';
import { DevicePhotoBatchActionsContainer } from './DevicePhotoBatchActionsContainer';

vi.mock('@/features/photos/useCases', () => ({
  deleteDevicePhotos: vi.fn(),
  uploadDevicePhotosToMyPhotos: vi.fn(),
}));

import { deleteDevicePhotos, uploadDevicePhotosToMyPhotos } from '@/features/photos/useCases';

function photo(id: string): DevicePhoto {
  return { id, thumbnailUrl: `/${id}-thumb.jpg`, fullUrl: `/${id}-thumb.jpg`, width: 100, height: 100 } as DevicePhoto;
}

describe('DevicePhotoBatchActionsContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUIStore.setState({ toastMessage: '', showToast: false });
    useDevicePhotosStore.getState().reset();
    useDevicePhotosStore.setState({ photos: [photo('p1'), photo('p2')], permission: 'granted', hasMore: false });
  });

  it('uploads the selected photos to Mis fotos after confirming', async () => {
    vi.mocked(uploadDevicePhotosToMyPhotos).mockResolvedValue([
      { clientUploadId: 'p1', asset: {} as never },
      { clientUploadId: 'p2', asset: {} as never },
    ]);
    const onDone = vi.fn();
    const user = userEvent.setup();

    render(<DevicePhotoBatchActionsContainer active selectedIds={new Set(['p1', 'p2'])} onDone={onDone} />);
    await user.click(screen.getByRole('button', { name: /subir 2 fotos/i }));
    await user.click(screen.getByRole('button', { name: 'Sí, subir' }));

    await waitFor(() =>
      expect(uploadDevicePhotosToMyPhotos).toHaveBeenCalledWith([photo('p1'), photo('p2')])
    );
    await waitFor(() => expect(onDone).toHaveBeenCalledWith());
  });

  it('does not upload anything if the confirmation is cancelled', async () => {
    const user = userEvent.setup();

    render(<DevicePhotoBatchActionsContainer active selectedIds={new Set(['p1'])} onDone={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /subir 1 foto/i }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(uploadDevicePhotosToMyPhotos).not.toHaveBeenCalled();
  });

  it('deletes the selected photos and exits selection when every id is deleted', async () => {
    vi.mocked(deleteDevicePhotos).mockResolvedValue({ granted: true, deletedIds: ['p1', 'p2'] });
    const onDone = vi.fn();
    const user = userEvent.setup();

    render(<DevicePhotoBatchActionsContainer active selectedIds={new Set(['p1', 'p2'])} onDone={onDone} />);
    await user.click(screen.getByRole('button', { name: /borrar 2 fotos/i }));
    await user.click(screen.getByRole('button', { name: 'Sí, borrar' }));

    await waitFor(() => expect(deleteDevicePhotos).toHaveBeenCalledWith(['p1', 'p2']));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith([]));
  });

  it('reports the ids that failed to delete on partial success, without exiting selection', async () => {
    vi.mocked(deleteDevicePhotos).mockResolvedValue({ granted: true, deletedIds: ['p1'] });
    const onDone = vi.fn();
    const user = userEvent.setup();

    render(<DevicePhotoBatchActionsContainer active selectedIds={new Set(['p1', 'p2'])} onDone={onDone} />);
    await user.click(screen.getByRole('button', { name: /borrar 2 fotos/i }));
    await user.click(screen.getByRole('button', { name: 'Sí, borrar' }));

    await waitFor(() => expect(onDone).toHaveBeenCalledWith(['p2']));
  });
});
