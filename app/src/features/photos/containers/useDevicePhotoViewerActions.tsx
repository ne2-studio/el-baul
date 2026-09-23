import { usePostHog } from 'posthog-js/react';
import { Upload } from 'lucide-react';
import { PhotoViewerMenuItem } from '@/features/photos/components/PhotoViewerHeader';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useUIStore } from '@/store/uiStore';
import { DevicePhoto } from '@/features/photos/native/devicePhotos';
import { uploadDevicePhotosToMyPhotos } from '@/features/photos/useCases';

interface UseDevicePhotoViewerActionsOptions {
  photo: DevicePhoto;
}

interface UseDevicePhotoViewerActionsResult {
  menuItems: PhotoViewerMenuItem[];
}

const UPLOAD_ACTION_KEY = 'upload-device-photo';

// "Subir foto" (GitHub issue #87) — the only action "En este dispositivo"'s viewer exposes; see
// DevicePhotoViewerContainer's own boundary note for why every other action (date editing,
// recuerdos, delete…) stays out. It saves the photo into Mis fotos, independently of "Borrar de
// este dispositivo" (#86) — the device copy is never touched either way.
//
// Delegates to uploadDevicePhotosToMyPhotos, kept array-first (a single-element array here) so
// #88's later multi-select batch upload can call the exact same use case unchanged.
export function useDevicePhotoViewerActions({ photo }: UseDevicePhotoViewerActionsOptions): UseDevicePhotoViewerActionsResult {
  const { run, isPending } = useAsyncAction();
  const posthog = usePostHog();
  const showToastMessage = useUIStore((state) => state.showToastMessage);

  const handleUpload = async () => {
    const result = await run(() => uploadDevicePhotosToMyPhotos([photo]), {
      key: UPLOAD_ACTION_KEY,
      errorMessage: 'Error al subir la foto',
    });
    if (!result.ok) return;

    // uploadDevicePhotosToMyPhotos never rejects — a per-photo failure (unreadable original,
    // failed upload request) comes back as an UploadItemResult.error instead, same convention
    // as every other upload use case (see uploads.ts).
    const [uploadResult] = result.value;
    if (uploadResult?.error) {
      showToastMessage(uploadResult.error, 'error');
      return;
    }

    posthog.capture('device_photo_uploaded');
    showToastMessage('Foto subida a Mis fotos');
  };

  const menuItems: PhotoViewerMenuItem[] = [
    {
      key: 'upload',
      label: 'Subir foto',
      icon: Upload,
      onSelect: () => {
        void handleUpload();
      },
      disabled: isPending(UPLOAD_ACTION_KEY),
    },
  ];

  return { menuItems };
}
