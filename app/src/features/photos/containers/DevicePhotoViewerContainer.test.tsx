// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DevicePhoto } from '@/features/photos/native/devicePhotos';
import { useUIStore } from '@/store/uiStore';
import { DevicePhotoViewerContainer } from './DevicePhotoViewerContainer';

vi.mock('@/features/photos/useCases', () => ({
  uploadDevicePhotosToMyPhotos: vi.fn(),
  deleteDevicePhotos: vi.fn(),
}));

import { deleteDevicePhotos, uploadDevicePhotosToMyPhotos } from '@/features/photos/useCases';

function devicePhoto(id: string): DevicePhoto {
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

  // GitHub issue #87: "Subir foto" is one of the menu actions "En este dispositivo"'s viewer offers.
  it('offers "Subir foto" in the "···" menu', async () => {
    const user = userEvent.setup();
    render(
      <DevicePhotoViewerContainer photo={devicePhoto('p1')} photos={[]} onClose={vi.fn()} onPhotoChange={vi.fn()} />
    );

    await openMenu(user);

    expect(screen.getByText('Subir foto')).toBeInTheDocument();
  });

  it('uploads the current photo to Mis fotos and shows a success toast', async () => {
    vi.mocked(uploadDevicePhotosToMyPhotos).mockResolvedValue([{ clientUploadId: 'p1', asset: undefined }]);
    const user = userEvent.setup();
    render(
      <DevicePhotoViewerContainer photo={devicePhoto('p1')} photos={[]} onClose={vi.fn()} onPhotoChange={vi.fn()} />
    );

    await openMenu(user);
    await user.click(screen.getByText('Subir foto'));

    await waitFor(() => expect(uploadDevicePhotosToMyPhotos).toHaveBeenCalledWith([devicePhoto('p1')]));
    await waitFor(() => expect(useUIStore.getState().toastMessage).toBe('Foto subida a Mis fotos'));
  });

  it('shows an error toast and keeps the photo when the upload fails, without closing the viewer', async () => {
    vi.mocked(uploadDevicePhotosToMyPhotos).mockResolvedValue([
      { clientUploadId: 'p1', error: 'No se pudo leer la foto original (puede que ya no esté disponible)' },
    ]);
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <DevicePhotoViewerContainer photo={devicePhoto('p1')} photos={[]} onClose={onClose} onPhotoChange={vi.fn()} />
    );

    await openMenu(user);
    await user.click(screen.getByText('Subir foto'));

    await waitFor(() =>
      expect(useUIStore.getState().toastMessage).toBe('No se pudo leer la foto original (puede que ya no esté disponible)')
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  // GitHub issue #86: "Borrar de este dispositivo" is a second, destructive menu action.
  it('deletes the photo from the device and closes the viewer once confirmed', async () => {
    vi.mocked(deleteDevicePhotos).mockResolvedValue({ granted: true, deletedIds: ['p1'] });
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <DevicePhotoViewerContainer photo={devicePhoto('p1')} photos={[devicePhoto('p1')]} onClose={onClose} onPhotoChange={vi.fn()} />
    );

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

    render(
      <DevicePhotoViewerContainer photo={devicePhoto('p1')} photos={[devicePhoto('p1')]} onClose={onClose} onPhotoChange={vi.fn()} />
    );

    await openMenu(user);
    await user.click(screen.getByText('Borrar de este dispositivo'));
    await user.click(screen.getByRole('button', { name: 'Sí, borrar' }));

    await waitFor(() => expect(deleteDevicePhotos).toHaveBeenCalledWith(['p1']));
    await waitFor(() => expect(useUIStore.getState().toastMessage).toBe('No se ha podido borrar la foto de este dispositivo'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
