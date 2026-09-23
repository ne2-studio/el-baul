// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUIStore } from '@/store/uiStore';
import { DevicePhoto } from '@/features/photos/native/devicePhotos';
import { DevicePhotoViewerContainer } from './DevicePhotoViewerContainer';

vi.mock('@/features/photos/useCases', () => ({
  uploadDevicePhotosToMyPhotos: vi.fn(),
}));

import { uploadDevicePhotosToMyPhotos } from '@/features/photos/useCases';

function devicePhoto(id: string): DevicePhoto {
  return { id, thumbnailUrl: `/${id}-thumb.jpg`, fullUrl: `/${id}-thumb.jpg`, width: 100, height: 100 } as DevicePhoto;
}

async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Más opciones' }));
}

// GitHub issue #87: "Subir foto" is the one menu action "En este dispositivo"'s viewer offers.
describe('DevicePhotoViewerContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUIStore.setState({ toastMessage: '', showToast: false });
  });

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
});
