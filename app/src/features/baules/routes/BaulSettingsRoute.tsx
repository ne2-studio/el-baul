import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePostHog } from 'posthog-js/react';
import { EditInfoModal } from '@/design-system/patterns/forms/EditInfoModal';
import { CoverPhotoPickerModal } from '@/features/photos/components/CoverPhotoPickerModal';
import { BaulSettingsScreen } from '@/features/baules/components/BaulSettingsScreen';
import { usePersonasStore } from '@/store/usePersonasStore';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useBaulScope } from '@/hooks/useBaulScope';
import { guardBaulScope } from '@/hooks/baulScopeGuard';
import { getBaulPermissions } from '@/utils/roleUtils';
import { renameBaul, setBaulCover } from '@/features/baules/useCases';
import { PhotoCrop, api } from '@/api';
import { Photo } from '@/types';

// Owns the cover/rename/removal-requests/delete actions that used to live inline in
// BaulSettingsMenuContainer's "···" dropdown, now surfaced as their own full screen — see
// docs/architecture/frontend.md's routes/ rule: this Route reads store state directly
// (usePersonasStore for pending removal requests) and calls useCases, and renders a
// presentational BaulSettingsScreen plus the modals it opens.
export const BaulSettingsRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baulId } = useParams();
  const { removalRequests } = usePersonasStore();
  const { run, isPending } = useAsyncAction();
  const posthog = usePostHog();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);

  const baulScope = useBaulScope(baulId);
  const guard = guardBaulScope(baulScope, { loadingLabel: 'Cargando ajustes...' });
  if (!guard.ready) return guard.screen;
  const { baul } = guard;

  const permissions = getBaulPermissions(baul);
  const pendingRemovalRequestsCount = (removalRequests[baul.id] || []).filter((r) => r.status === 'pending').length;
  const canReviewRemovalRequests = pendingRemovalRequestsCount > 0;

  const handleSaveBaulInfo = async (name: string, description: string) => {
    const result = await run(() => renameBaul(baul.id, name, description), {
      successMessage: 'Información del baúl actualizada',
      errorMessage: 'Error al actualizar la información del baúl',
    });
    if (result.ok) {
      posthog.capture('baul_renamed');
      setShowEditModal(false);
    }
  };

  const handleSetBaulCover = (photo: Photo, crop: PhotoCrop) => {
    run(() => setBaulCover(baul.id, photo.id, crop, photo.thumbnailUrl), {
      successMessage: 'Portada del baúl actualizada',
      errorMessage: 'Error al establecer la portada',
    }).then((result) => {
      if (result.ok) posthog.capture('baul_cover_changed');
    });
  };

  return (
    <>
      <BaulSettingsScreen
        onBack={() => navigate(`/baules/${baul.id}`)}
        canSetCover={permissions.canSetBaulCover}
        canEditInfo={permissions.canEditBaul}
        canReviewRemovalRequests={canReviewRemovalRequests}
        canRequestBaulDeletion={permissions.canRequestBaulDeletion}
        pendingRemovalRequestsCount={pendingRemovalRequestsCount}
        onPickCover={() => setShowCoverPicker(true)}
        onEditInfo={() => setShowEditModal(true)}
        onReviewRemovalRequests={() => navigate(`/eliminar-solicitudes/${baul.id}`)}
        onDeleteBaul={() => navigate(`/baules/${baul.id}/solicitar-borrado`)}
      />

      {showEditModal && (
        <EditInfoModal
          title="Editar información del baúl"
          initialName={baul.name}
          initialDescription={baul.description ?? ''}
          namePlaceholder="Nombre del baúl"
          onCancel={() => setShowEditModal(false)}
          onSave={handleSaveBaulInfo}
          isSubmitting={isPending()}
        />
      )}

      {showCoverPicker && (
        <CoverPhotoPickerModal
          title="Elegir portada del baúl"
          fetchPage={(skip, take) => api.photos.getPage(baul.id, { skip, take })}
          onSelect={handleSetBaulCover}
          onCancel={() => setShowCoverPicker(false)}
        />
      )}
    </>
  );
};
