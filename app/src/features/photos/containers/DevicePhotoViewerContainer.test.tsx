// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DevicePhoto } from '@/features/photos/native/devicePhotos';
import { useUIStore } from '@/store/uiStore';
import { DevicePhotoViewerContainer } from './DevicePhotoViewerContainer';

vi.mock('@/features/photos/useCases', () => ({
  deleteDevicePhotos: vi.fn(),
}));

import { deleteDevicePhotos } from '@/features/photos/useCases';

function photo(id: string): DevicePhoto {
  return { id, thumbnailUrl: `/${id}-thumb.jpg`, fullUrl: `/${id}-thumb.jpg`, width: 100, height: 100 } as DevicePhoto;
}

async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Más opciones' }));
}

describe('DevicePhotoViewerContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUIStore.setState({ toastMessage: '', showToast: false });
  });

  it('deletes the photo from the device and closes the viewer once confirmed', async () => {
    vi.mocked(deleteDevicePhotos).mockResolvedValue({ granted: true, deletedIds: ['p1'] });
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<DevicePhotoViewerContainer photo={photo('p1')} photos={[photo('p1')]} onClose={onClose} onPhotoChange={vi.fn()} />);

    await openMenu(user);
    await user.click(screen.getByText('Borrar de este dispositivo'));
    await user.click(screen.getByRole('button', { name: 'Sí, borrar' }));

    await waitFor(() => expect(deleteDevicePhotos).toHaveBeenCalledWith(['p1']));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(useUIStore.getState().toastMessage).toBe('Foto borrada de este dispositivo');
  });

  // The Android system dialog can be denied — no exception is thrown, deletePhotos simply
  // reports the id as not deleted (see DeletePhotosResult) — the viewer must leave the photo in
  // place and surface an error instead of silently closing.
  it('leaves the photo in place and shows an error when the system dialog is denied', async () => {
    vi.mocked(deleteDevicePhotos).mockResolvedValue({ granted: false, deletedIds: [] });
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<DevicePhotoViewerContainer photo={photo('p1')} photos={[photo('p1')]} onClose={onClose} onPhotoChange={vi.fn()} />);

    await openMenu(user);
    await user.click(screen.getByText('Borrar de este dispositivo'));
    await user.click(screen.getByRole('button', { name: 'Sí, borrar' }));

    await waitFor(() => expect(deleteDevicePhotos).toHaveBeenCalledWith(['p1']));
    await waitFor(() => expect(useUIStore.getState().toastMessage).toBe('No se ha podido borrar la foto de este dispositivo'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
