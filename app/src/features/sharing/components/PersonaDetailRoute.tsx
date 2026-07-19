import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PersonaDetailScreen } from '@/app/components/PersonaDetailScreen';
import { EditPersonaModal } from '@/app/components/EditPersonaModal';
import { useAppStore } from '@/store/useAppStore';
import { useUIStore } from '@/store/uiStore';
import { isAdminRole } from '@/utils/roleUtils';
import { BaulRole } from '@/types';

export const PersonaDetailRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baulId, sharedUserId } = useParams();
  const showToastMessage = useUIStore(state => state.showToastMessage);
  const {
    baules,
    sharedUsers,
    loadSharedUsers,
    updatePersona,
    uploadPersonaAvatar,
    updateUserRole,
    revokeAccess,
  } = useAppStore();

  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const baul = baules.find(b => b.id === baulId);
  const persona = (sharedUsers[baulId || ''] || []).find(u => u.id === sharedUserId);

  useEffect(() => {
    if (!baulId || persona) return;

    setIsLoading(true);
    loadSharedUsers(baulId)
      .catch((error) => {
        console.error('Error loading persona:', error);
        showToastMessage('Error al cargar la ficha');
      })
      .finally(() => setIsLoading(false));
  }, [baulId, persona, loadSharedUsers, showToastMessage]);

  if (isLoading) return <div className="p-8 text-center">Cargando...</div>;
  if (!baulId || !sharedUserId || !persona) return <div className="p-8 text-center">No se ha encontrado la persona.</div>;

  const handleSave = (name: string, nickname: string) => {
    updatePersona(baulId, sharedUserId, name, nickname)
      .then(() => {
        setIsEditing(false);
        showToastMessage('Ficha actualizada');
      })
      .catch((error) => {
        console.error('Error updating persona:', error);
        showToastMessage('Error al actualizar la ficha');
      });
  };

  const handleUploadAvatar = (file: File) => {
    uploadPersonaAvatar(baulId, sharedUserId, file).catch((error) => {
      console.error('Error uploading avatar:', error);
      showToastMessage('Error al subir la foto');
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      showToastMessage('Enlace de invitación copiado al portapapeles');
    }).catch(err => {
      console.error('Error copying to clipboard:', err);
      showToastMessage('Error al copiar el enlace');
    });
  };

  const handleShareInvite = async () => {
    const inviteUrl = `${window.location.origin}/invitacion/persona/${persona.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invitación a ${baul?.name ?? 'El Baúl'}`,
          text: `${persona.nickname}, te invito a unirte a mi baúl de recuerdos "${baul?.name ?? ''}" en El Baúl.`,
          url: inviteUrl,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing:', error);
          copyToClipboard(inviteUrl);
        }
      }
    } else {
      copyToClipboard(inviteUrl);
    }
  };

  const handleChangeRole = (role: BaulRole) => {
    updateUserRole(baulId, sharedUserId, role).catch((error) => {
      console.error('Error updating role:', error);
      showToastMessage('Error al actualizar el rol');
    });
  };

  const handleRevokeAccess = () => {
    revokeAccess(baulId, sharedUserId)
      .then(() => navigate(`/baules/${baulId}`))
      .catch((error) => {
        console.error('Error revoking access:', error);
        showToastMessage('Error al quitar el acceso');
      });
  };

  return (
    <>
      <PersonaDetailScreen
        persona={persona}
        isAdmin={isAdminRole(baul?.role)}
        onBack={() => navigate(`/baules/${baulId}`)}
        onEdit={() => setIsEditing(true)}
        onShareInvite={handleShareInvite}
        onChangeRole={handleChangeRole}
        onRevokeAccess={handleRevokeAccess}
      />
      {isEditing && (
        <EditPersonaModal
          persona={persona}
          onCancel={() => setIsEditing(false)}
          onSave={handleSave}
          onUploadAvatar={handleUploadAvatar}
        />
      )}
    </>
  );
};
