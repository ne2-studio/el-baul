import React, { useState } from 'react';
import { usePostHog } from 'posthog-js/react';
import { Camera, Loader2, MoreVertical, Pencil, Send, UserCog, Users, UserX } from 'lucide-react';
import { Button } from '@/design-system/components/actions/Button';
import { EditPersonaInfoModal } from '@/features/people/components/EditPersonaInfoModal';
import { PersonaAvatarPickerModal } from '@/features/people/components/PersonaAvatarPickerModal';
import { ManageAccessModal } from '@/features/people/components/ManageAccessModal';
import { RevokeAccessModal } from '@/features/people/components/RevokeAccessModal';
import { EditRelationshipsModal } from '@/features/people/components/EditRelationshipsModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/design-system/components/ui/dropdown-menu';
import { PhotoCrop, api } from '@/api';
import { BaulRole, Persona, Photo } from '@/types';
import { hashInviteToken } from '@/features/sharing/inviteTokenHash';
import { getBaulPermissions, getPersonaPermissions } from '@/utils/roleUtils';
import { getChildren, getParents } from '@/utils/personaRelationships';
import { useBaulesStore } from '@/store/useBaulesStore';
import { usePersonasStore } from '@/store/usePersonasStore';
import { hydratePhotos, usePhotosStore } from '@/store/usePhotosStore';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useUIStore } from '@/store/uiStore';
import {
  updatePersona,
  uploadPersonaAvatar,
  setPersonaAvatarPhoto,
  updateUserRole,
  revokeAccess,
  sharePersonaInvite,
  addPersonaRelationship,
  removePersonaRelationship,
} from '@/features/people/useCases';

interface PersonaSettingsMenuContainerProps {
  baulId: string;
  persona: Persona;
}

// Self-sufficient "···" menu: owns edit-info/avatar/role/revoke-access end to end, so
// PersonaDetailRoute (its only caller) doesn't need to know these settings exist beyond
// mounting this in its header's trailing slot. Nothing here navigates — every action is an
// in-place mutation with a toast — see docs/architecture/frontend.md's containers/ rule.
export function PersonaSettingsMenuContainer({ baulId, persona }: PersonaSettingsMenuContainerProps) {
  const { baules } = useBaulesStore();
  const { personaPhotos, personas, relationships } = usePersonasStore();
  const photosById = usePhotosStore((state) => state.photosById);
  const { run, isPending } = useAsyncAction();
  const showToastMessage = useUIStore((state) => state.showToastMessage);
  const posthog = usePostHog();
  const currentBaul = baules.find((b) => b.id === baulId);
  const permissions = getPersonaPermissions({ currentBaulRole: currentBaul?.role, currentIsCustodio: currentBaul?.isCustodio, persona });
  const baulPermissions = getBaulPermissions(currentBaul);
  // Same permission InvitarFamiliaRoute already requires to invite a persona, plus the persona
  // itself being invitable: not yet joined, and never for a "sin acceso" persona.
  const canSendInvite = baulPermissions.canManageBaulInvite && persona.status === 'pending' && persona.role !== 'sin_acceso';
  // Separators must reflect whether the groups they sit between actually render items, not just
  // the raw permission flags — otherwise an empty group (e.g. a pending persona, whose "manage
  // access" actions are both hidden) leaves two adjacent separators with nothing in between.
  const showsInfoGroup = permissions.canEditPersonaInfo || permissions.canUploadPersonaAvatar || permissions.canEditPersonaRelationships;
  const showsAccessGroup = permissions.canChangePersonaRole || canSendInvite;
  const showsRevokeGroup = permissions.canRevokePersonaAccess;

  const baulPersonas = personas[baulId] || [];
  const baulRelationships = relationships[baulId] || [];

  const [showEditInfoModal, setShowEditInfoModal] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showRelationshipsModal, setShowRelationshipsModal] = useState(false);
  const [removingRelationshipId, setRemovingRelationshipId] = useState<string | null>(null);
  const [showManageAccessModal, setShowManageAccessModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);

  if (!permissions.canEditPersonaInfo && !permissions.canManagePersona && !permissions.canEditPersonaRelationships) return null;

  const handleSaveInfo = async (name: string, nickname: string) => {
    const result = await run(() => updatePersona(baulId, persona.id, name, nickname), {
      key: 'save',
      successMessage: 'Ficha actualizada',
      errorMessage: 'Error al actualizar la ficha',
    });
    if (result.ok) {
      posthog.capture('persona_edited');
      setShowEditInfoModal(false);
    }
  };

  const handleUploadAvatar = (file: File, crop: PhotoCrop) => {
    run(() => uploadPersonaAvatar(baulId, persona.id, file, crop), {
      key: 'avatar',
      successMessage: 'Foto de perfil actualizada',
      errorMessage: 'Error al subir la foto',
    }).then((result) => {
      if (result.ok) {
        posthog.capture('persona_avatar_changed', { source: 'upload' });
        setShowAvatarPicker(false);
      }
    });
  };

  const handleSetAvatarPhoto = (photo: Photo, crop: PhotoCrop) => {
    run(() => setPersonaAvatarPhoto(baulId, persona.id, photo, crop), {
      key: 'avatar',
      successMessage: 'Foto de perfil actualizada',
      errorMessage: 'Error al actualizar la foto',
    }).then((result) => {
      if (result.ok) {
        posthog.capture('persona_avatar_changed', { source: 'existing_photo' });
        setShowAvatarPicker(false);
      }
    });
  };

  const handleAddRelationship = async (parentId: string, childId: string): Promise<boolean> => {
    const result = await run(() => addPersonaRelationship(baulId, parentId, childId), {
      key: 'relationship-add',
      errorMessage: 'Error al añadir la relación',
    });
    if (result.ok) posthog.capture('persona_relationship_added');
    return result.ok;
  };

  const handleRemoveRelationship = async (relatedPersonaId: string) => {
    setRemovingRelationshipId(relatedPersonaId);
    const result = await run(() => removePersonaRelationship(baulId, persona.id, relatedPersonaId), {
      key: `relationship-remove-${relatedPersonaId}`,
      errorMessage: 'Error al eliminar la relación',
    });
    if (result.ok) posthog.capture('persona_relationship_removed');
    setRemovingRelationshipId(null);
  };

  const handleChangeRole = async (role: BaulRole) => {
    const result = await run(() => updateUserRole(baulId, persona.id, role), {
      key: 'role',
      successMessage: 'Rol actualizado',
      errorMessage: 'Error al actualizar el rol',
    });
    if (result.ok) {
      posthog.capture('persona_role_changed', { role });
      setShowManageAccessModal(false);
    }
  };

  const handleSendInvite = () => {
    run(() => sharePersonaInvite(currentBaul!, persona, () => showToastMessage('Enlace copiado al portapapeles')), {
      key: 'invite',
      errorMessage: 'Error al invitar',
    }).then(async (result) => {
      if (result.ok) {
        posthog.capture('family_invite_shared', {
          context: 'resend',
          baulId,
          personaId: persona.id,
          inviteTokenHash: await hashInviteToken(result.value.token),
        });
      }
    });
  };

  const handleConfirmRevoke = async () => {
    const result = await run(() => revokeAccess(baulId, persona.id), {
      key: 'revoke',
      successMessage: 'Acceso revocado',
      errorMessage: 'Error al revocar el acceso',
    });
    if (result.ok) {
      posthog.capture('persona_access_revoked');
      setShowRevokeModal(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="plain"
            className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-secondary"
            aria-label="Opciones de la persona"
          >
            <MoreVertical className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {permissions.canEditPersonaInfo && (
            <DropdownMenuItem onClick={() => setShowEditInfoModal(true)}>
              <Pencil className="w-4 h-4 mr-2" />
              Editar información
            </DropdownMenuItem>
          )}

          {permissions.canUploadPersonaAvatar && (
            <DropdownMenuItem onClick={() => setShowAvatarPicker(true)} disabled={isPending('avatar')}>
              {isPending('avatar') ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Camera className="w-4 h-4 mr-2" />
              )}
              Cambiar foto de perfil
            </DropdownMenuItem>
          )}

          {permissions.canEditPersonaRelationships && (
            <DropdownMenuItem onClick={() => setShowRelationshipsModal(true)}>
              <Users className="w-4 h-4 mr-2" />
              Editar relaciones
            </DropdownMenuItem>
          )}

          {showsInfoGroup && showsAccessGroup && <DropdownMenuSeparator />}

          {permissions.canChangePersonaRole && (
            <DropdownMenuItem onClick={() => setShowManageAccessModal(true)}>
              <UserCog className="w-4 h-4 mr-2" />
              Gestionar permisos
            </DropdownMenuItem>
          )}

          {canSendInvite && (
            <DropdownMenuItem onClick={handleSendInvite} disabled={isPending('invite')}>
              {isPending('invite') ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Enviar invitación
            </DropdownMenuItem>
          )}

          {(showsInfoGroup || showsAccessGroup) && showsRevokeGroup && <DropdownMenuSeparator />}

          {permissions.canRevokePersonaAccess && (
            <DropdownMenuItem variant="destructive" onClick={() => setShowRevokeModal(true)}>
              <UserX className="w-4 h-4 mr-2" />
              Revocar acceso
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {showEditInfoModal && (
        <EditPersonaInfoModal
          persona={persona}
          onCancel={() => setShowEditInfoModal(false)}
          onSave={handleSaveInfo}
          isSubmitting={isPending('save')}
        />
      )}

      {showAvatarPicker && (
        <PersonaAvatarPickerModal
          personaName={persona.nickname}
          taggedPhotos={hydratePhotos(personaPhotos[persona.id], photosById) || []}
          fetchPage={(skip, take) => api.photos.getPage(baulId, { skip, take })}
          onSelectExisting={handleSetAvatarPhoto}
          onUploadNew={handleUploadAvatar}
          onCancel={() => setShowAvatarPicker(false)}
          isSubmitting={isPending('avatar')}
        />
      )}

      {showRelationshipsModal && (
        <EditRelationshipsModal
          personaId={persona.id}
          personaName={persona.name || persona.nickname}
          parents={getParents(baulRelationships, baulPersonas, persona.id)}
          children={getChildren(baulRelationships, baulPersonas, persona.id)}
          candidates={baulPersonas.filter((candidate) => candidate.id !== persona.id)}
          onRemove={handleRemoveRelationship}
          removingId={removingRelationshipId}
          onAdd={handleAddRelationship}
          isSubmittingAdd={isPending('relationship-add')}
          onCancel={() => setShowRelationshipsModal(false)}
        />
      )}

      {showManageAccessModal && (
        <ManageAccessModal
          role={persona.role}
          isActive={persona.status === 'active'}
          onSave={handleChangeRole}
          onCancel={() => setShowManageAccessModal(false)}
          isSubmitting={isPending('role')}
        />
      )}

      {showRevokeModal && (
        <RevokeAccessModal
          userName={persona.name || persona.nickname}
          isSubmitting={isPending('revoke')}
          onConfirm={handleConfirmRevoke}
          onCancel={() => setShowRevokeModal(false)}
        />
      )}
    </>
  );
}
