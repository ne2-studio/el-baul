import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ImageIcon, Link2, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { IconButton } from '@/design-system/components/actions/IconButton';
import { CounterBadge } from '@/design-system/components/data-display/Badges';
import { EditInfoModal } from '@/design-system/patterns/forms/EditInfoModal';
import { InviteFamilyModal } from '@/features/sharing/components/InviteFamilyModal';
import { CoverPhotoPickerModal } from '@/features/photos/components/CoverPhotoPickerModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/design-system/components/ui/dropdown-menu';
import { Baul, Photo } from '@/types';
import { getBaulPermissions } from '@/utils/roleUtils';
import { usePersonasStore } from '@/store/usePersonasStore';
import { useUIStore } from '@/store/uiStore';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { renameBaul, setBaulCover } from '@/features/baules/useCases';
import { api } from '@/api';

interface BaulSettingsMenuContainerProps {
  baul: Baul;
}

// Self-sufficient "···" menu: owns the invite-link/cover/rename/removal-requests/delete
// actions and their modals end to end, so ChaptersView (its only caller) doesn't need to
// know baúl settings exist beyond mounting this in its header's trailing slot. Self-navigates
// to removal-requests/delete-request — both only need baul.id, nothing route-context-dependent
// — see docs/architecture/frontend.md's containers/ rule.
export function BaulSettingsMenuContainer({ baul }: BaulSettingsMenuContainerProps) {
  const navigate = useNavigate();
  const { removalRequests } = usePersonasStore();
  const showToastMessage = useUIStore((state) => state.showToastMessage);
  const { run, isPending } = useAsyncAction();
  const permissions = getBaulPermissions(baul);
  const pendingRemovalRequestsCount = (removalRequests[baul.id] || []).filter((r) => r.status === 'pending').length;

  const [showEditModal, setShowEditModal] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [showInviteFamilyModal, setShowInviteFamilyModal] = useState(false);

  const canManageInvite = permissions.canManageBaulInvite;
  const canEditInfo = permissions.canEditBaul;
  const canSetCover = permissions.canSetBaulCover;
  const canReviewRemovalRequests = pendingRemovalRequestsCount > 0;

  const handleSaveBaulInfo = async (name: string, description: string) => {
    const result = await run(() => renameBaul(baul.id, name, description), {
      successMessage: 'Información del baúl actualizada',
      errorMessage: 'Error al actualizar la información del baúl',
    });
    if (result.ok) setShowEditModal(false);
  };

  const handleSetBaulCover = (photo: Photo) => {
    run(() => setBaulCover(baul.id, photo.id, photo.thumbnailUrl), {
      successMessage: 'Portada del baúl actualizada',
      errorMessage: 'Error al establecer la portada',
    });
  };

  if (!canManageInvite && !canEditInfo && !canSetCover && !canReviewRemovalRequests && !permissions.canRequestBaulDeletion) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton aria-label="Opciones del baúl" badgeDot={canReviewRemovalRequests}>
            <MoreVertical className="w-5 h-5" />
          </IconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {canManageInvite && (
            <DropdownMenuItem onClick={() => setShowInviteFamilyModal(true)}>
              <Link2 className="w-4 h-4 mr-2" />
              Invitar a la familia
            </DropdownMenuItem>
          )}

          {canManageInvite && (canSetCover || canEditInfo) && <DropdownMenuSeparator />}

          {canSetCover && (
            <DropdownMenuItem onClick={() => setShowCoverPicker(true)}>
              <ImageIcon className="w-4 h-4 mr-2" />
              Elegir foto de portada
            </DropdownMenuItem>
          )}

          {canEditInfo && (
            <DropdownMenuItem onClick={() => setShowEditModal(true)}>
              <Pencil className="w-4 h-4 mr-2" />
              Editar información del baúl
            </DropdownMenuItem>
          )}

          {canEditInfo && canReviewRemovalRequests && <DropdownMenuSeparator />}

          {canReviewRemovalRequests && (
            <DropdownMenuItem onClick={() => navigate(`/eliminar-solicitudes/${baul.id}`)}>
              <Bell className="w-4 h-4 mr-2" />
              <span>Solicitudes de eliminación</span>
              <CounterBadge count={pendingRemovalRequestsCount} className="ml-auto" />
            </DropdownMenuItem>
          )}

          {permissions.canRequestBaulDeletion && (canEditInfo || canReviewRemovalRequests) && <DropdownMenuSeparator />}

          {permissions.canRequestBaulDeletion && (
            <DropdownMenuItem variant="destructive" onClick={() => navigate(`/baules/${baul.id}/solicitar-borrado`)}>
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar baúl
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {showInviteFamilyModal && (
        <InviteFamilyModal
          baulName={baul.name}
          fetchLink={() => api.baules.getInviteLink(baul.id)}
          onRegenerate={() => api.baules.regenerateInviteLink(baul.id)}
          onCancel={() => setShowInviteFamilyModal(false)}
          onToast={showToastMessage}
        />
      )}

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
}
