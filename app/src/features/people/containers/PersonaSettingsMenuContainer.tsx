import React, { useState } from 'react';
import { Camera, Loader2, MoreVertical, Pencil, UserCog, UserPlus, UserX } from 'lucide-react';
import { Button } from '@/design-system/components/actions/Button';
import { EditPersonaInfoModal } from '@/features/people/components/EditPersonaInfoModal';
import { PersonaAvatarPickerModal } from '@/features/people/components/PersonaAvatarPickerModal';
import { ManageAccessModal } from '@/features/people/components/ManageAccessModal';
import { RevokeAccessModal } from '@/features/people/components/RevokeAccessModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/design-system/components/ui/dropdown-menu';
import { AvatarCrop, api } from '@/api';
import { BaulRole, Persona, Photo } from '@/types';
import { getPersonaPermissions } from '@/utils/roleUtils';
import { useBaulesStore } from '@/store/useBaulesStore';
import { usePersonasStore } from '@/store/usePersonasStore';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { updatePersona, uploadPersonaAvatar, setPersonaAvatarPhoto, updateUserRole, revokeAccess } from '@/features/people/useCases';

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
  const { personaPhotos } = usePersonasStore();
  const { run, isPending } = useAsyncAction();
  const currentBaulRole = baules.find((b) => b.id === baulId)?.role;
  const permissions = getPersonaPermissions({ currentBaulRole, persona });

  const [showEditInfoModal, setShowEditInfoModal] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showManageAccessModal, setShowManageAccessModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);

  if (!permissions.canEditPersonaInfo && !permissions.canManagePersona) return null;

  const handleSaveInfo = async (name: string, nickname: string) => {
    const result = await run(() => updatePersona(baulId, persona.id, name, nickname), {
      key: 'save',
      successMessage: 'Ficha actualizada',
      errorMessage: 'Error al actualizar la ficha',
    });
    if (result.ok) setShowEditInfoModal(false);
  };

  const handleUploadAvatar = (file: File, crop: AvatarCrop) => {
    run(() => uploadPersonaAvatar(baulId, persona.id, file, crop), {
      key: 'avatar',
      successMessage: 'Foto de perfil actualizada',
      errorMessage: 'Error al subir la foto',
    }).then((result) => {
      if (result.ok) setShowAvatarPicker(false);
    });
  };

  const handleSetAvatarPhoto = (photo: Photo, crop: AvatarCrop) => {
    run(() => setPersonaAvatarPhoto(baulId, persona.id, photo, crop), {
      key: 'avatar',
      successMessage: 'Foto de perfil actualizada',
      errorMessage: 'Error al actualizar la foto',
    }).then((result) => {
      if (result.ok) setShowAvatarPicker(false);
    });
  };

  const handleChangeRole = (role: BaulRole) => {
    run(() => updateUserRole(baulId, persona.id, role), {
      key: 'role',
      errorMessage: 'Error al actualizar el rol',
    });
  };

  const handleConfirmRevoke = async () => {
    const result = await run(() => revokeAccess(baulId, persona.id), {
      key: 'revoke',
      successMessage: 'Acceso revocado',
      errorMessage: 'Error al revocar el acceso',
    });
    if (result.ok) setShowRevokeModal(false);
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

          {permissions.canEditPersonaInfo && permissions.canManagePersona && <DropdownMenuSeparator />}

          {permissions.canChangePersonaRole && (
            <DropdownMenuItem onClick={() => setShowManageAccessModal(true)}>
              <UserCog className="w-4 h-4 mr-2" />
              Gestionar acceso
            </DropdownMenuItem>
          )}

          {permissions.canRestorePersonaAccess && (
            <DropdownMenuItem onClick={() => handleChangeRole('colaborador')}>
              <UserPlus className="w-4 h-4 mr-2" />
              Permitir invitación
            </DropdownMenuItem>
          )}

          {permissions.canManagePersona && <DropdownMenuSeparator />}

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
          taggedPhotos={personaPhotos[persona.id] || []}
          fetchPage={(skip, take) => api.photos.getPage(baulId, { skip, take })}
          onSelectExisting={handleSetAvatarPhoto}
          onUploadNew={handleUploadAvatar}
          onCancel={() => setShowAvatarPicker(false)}
          isSubmitting={isPending('avatar')}
        />
      )}

      {showManageAccessModal && (
        <ManageAccessModal
          role={persona.role}
          onChangeRole={handleChangeRole}
          onCancel={() => setShowManageAccessModal(false)}
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
