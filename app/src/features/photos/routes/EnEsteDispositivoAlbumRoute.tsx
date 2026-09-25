import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { PageHeader } from '@/design-system/layouts/PageHeader';
import { DevicePhotoGalleryContainer } from '@/features/photos/containers/DevicePhotoGalleryContainer';
import { DevicePhotoBatchActionsContainer } from '@/features/photos/containers/DevicePhotoBatchActionsContainer';
import { useDeviceAlbumsStore } from '@/store/useDeviceAlbumsStore';

// One MediaStore folder opened from EnEsteDispositivoRoute's "carpetas" grid — same API-free
// boundary as that route (single-photo actions like "Borrar de este dispositivo", GitHub issue
// #86, stay entirely client/native-side). Title falls back to a generic label rather than blocking on
// re-fetching albums: the album list only lives in memory (useDeviceAlbumsStore), so a deep link
// or a refresh landing straight here wouldn't have it yet, and the photos below don't need it to
// load.
//
// Multi-selection (GitHub issue #88) is kept inline here, same reasoning as MisFotosRoute
// keeping its own selectionMode/selectedIds instead of inside the gallery container: the header
// (title vs. selection counter) and the batch action bar both need this state. Selection is
// scoped to this one album, same as the gallery's own infinite scroll — leaving the album resets
// it (this component unmounts).
export const EnEsteDispositivoAlbumRoute: React.FC = () => {
  const navigate = useNavigate();
  const { albumId } = useParams<{ albumId: string }>();
  const album = useDeviceAlbumsStore((state) => state.albums)?.find((a) => a.albumId === albumId);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      setSelectionMode(next.size > 0);
      return next;
    });
  };

  const handleLongPress = (photoId: string) => {
    setSelectionMode(true);
    setSelectedIds(new Set([photoId]));
  };

  // remainingIds ausente/vacío = la acción en lote ha resuelto toda la selección, sale del modo
  // selección — no vacío (solo puede venir del borrado parcial) = deja esos ids seleccionados y
  // visibles en vez de cerrar, ver DevicePhotoBatchActionsBar's own doc comment.
  const handleBatchDone = (remainingIds?: string[]) => {
    if (remainingIds && remainingIds.length > 0) {
      setSelectedIds(new Set(remainingIds));
      return;
    }
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        variant="inline"
        title={selectionMode
          ? `${selectedIds.size} ${selectedIds.size === 1 ? 'seleccionada' : 'seleccionadas'}`
          : (album?.displayName ?? 'Carpeta')}
        onBack={selectionMode ? () => handleBatchDone() : () => navigate('/en-este-dispositivo')}
      />

      <PageContainer className="py-6 pb-28">
        <DevicePhotoGalleryContainer
          albumId={albumId}
          selectionMode={selectionMode}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onLongPress={handleLongPress}
        />
      </PageContainer>

      <DevicePhotoBatchActionsContainer active={selectionMode} selectedIds={selectedIds} onDone={handleBatchDone} />
    </div>
  );
};
