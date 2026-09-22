import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { PageHeader } from '@/design-system/layouts/PageHeader';
import { DevicePhotoGalleryContainer } from '@/features/photos/containers/DevicePhotoGalleryContainer';
import { useDeviceAlbumsStore } from '@/store/useDeviceAlbumsStore';

// One MediaStore folder opened from EnEsteDispositivoRoute's "carpetas" grid — same read-only,
// API-free boundary as that route. Title falls back to a generic label rather than blocking on
// re-fetching albums: the album list only lives in memory (useDeviceAlbumsStore), so a deep link
// or a refresh landing straight here wouldn't have it yet, and the photos below don't need it to
// load.
export const EnEsteDispositivoAlbumRoute: React.FC = () => {
  const navigate = useNavigate();
  const { albumId } = useParams<{ albumId: string }>();
  const album = useDeviceAlbumsStore((state) => state.albums)?.find((a) => a.albumId === albumId);

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        variant="inline"
        title={album?.displayName ?? 'Carpeta'}
        onBack={() => navigate('/en-este-dispositivo')}
      />

      <PageContainer className="py-6 pb-28">
        <DevicePhotoGalleryContainer albumId={albumId} />
      </PageContainer>
    </div>
  );
};
