import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Share } from '@capacitor/share';
import { PersonaDetailScreen } from '@/features/people/components/PersonaDetailScreen';
import { EditPersonaInfoModal } from '@/features/people/components/EditPersonaInfoModal';
import { EditBiografiaModal } from '@/features/people/components/EditBiografiaModal';
import { useBaulesStore } from '@/store/useBaulesStore';
import { usePersonasStore } from '@/store/usePersonasStore';
import { useUIStore } from '@/store/uiStore';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { getPersonaPermissions } from '@/utils/roleUtils';
import { BaulRole } from '@/types';

export const PersonaDetailRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { baulId, personaId } = useParams();
  const returnTab = (location.state as { returnTab?: 'capitulos' | 'personas' | 'recuerdos' } | null)?.returnTab ?? 'personas';
  const showToastMessage = useUIStore(state => state.showToastMessage);
  const appUrl = useAppConfigStore(state => state.appUrl);
  const { baules } = useBaulesStore();
  const {
    personas,
    loadPersonas,
    updatePersona,
    uploadPersonaAvatar,
    updateUserRole,
    revokeAccess,
    personaPhotos,
    loadPersonaPhotos,
  } = usePersonasStore();
  const { run, isPending } = useAsyncAction();

  const [isLoading, setIsLoading] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [isEditingBiografia, setIsEditingBiografia] = useState(false);

  const baul = baules.find(b => b.id === baulId);
  const persona = (personas[baulId || ''] || []).find(u => u.id === personaId);

  useEffect(() => {
    if (!baulId || persona) return;

    setIsLoading(true);
    run(() => loadPersonas(baulId), { key: 'personas', errorMessage: 'Error al cargar la ficha' }).finally(() =>
      setIsLoading(false)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baulId, persona, loadPersonas]);

  useEffect(() => {
    if (!baulId || !personaId || personaPhotos[personaId]) return;
    // Distinct key — this effect can fire in the same flush as the one above (e.g. on first
    // mount with nothing cached yet), and useAsyncAction.run() shares a default key across
    // unkeyed calls, so without this the second call would silently no-op.
    run(() => loadPersonaPhotos(baulId, personaId), { key: 'persona-photos', errorMessage: 'Error al cargar las fotos' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baulId, personaId, personaPhotos, loadPersonaPhotos]);

  if (isLoading) return <div className="p-8 text-center">Cargando...</div>;
  if (!baulId || !personaId || !persona) return <div className="p-8 text-center">No se ha encontrado la persona.</div>;

  const personaPermissions = getPersonaPermissions({ currentBaulRole: baul?.role, persona });

  const handleSaveInfo = async (name: string, nickname: string) => {
    const result = await run(() => updatePersona(baulId, personaId, name, nickname, persona.biografia || ''), {
      key: 'save',
      successMessage: 'Ficha actualizada',
      errorMessage: 'Error al actualizar la ficha',
    });
    if (result.ok) setIsEditingInfo(false);
  };

  const handleSaveBiografia = async (biografia: string) => {
    const result = await run(() => updatePersona(baulId, personaId, persona.name || '', persona.nickname, biografia), {
      key: 'save',
      successMessage: 'Biografía actualizada',
      errorMessage: 'Error al actualizar la biografía',
    });
    if (result.ok) setIsEditingBiografia(false);
  };

  const handleUploadAvatar = (file: File) => {
    run(() => uploadPersonaAvatar(baulId, personaId, file), {
      key: 'avatar',
      errorMessage: 'Error al subir la foto',
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
    const inviteUrl = `${appUrl}/invitacion/persona/${persona.id}`;

    try {
      // @capacitor/share opens the real native share sheet on Android/iOS and the Web
      // Share API in a browser — one call, no more branching on navigator.share, whose
      // support inside the Capacitor WebView isn't reliable across Android versions.
      await Share.share({
        title: `Invitación a ${baul?.name ?? 'El Baúl'}`,
        text: `${persona.nickname}, te invito a unirte a mi baúl de recuerdos "${baul?.name ?? ''}" en El Baúl.`,
        url: inviteUrl,
      });
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      console.error('Error sharing invite:', error);
      copyToClipboard(inviteUrl);
    }
  };

  const handleChangeRole = (role: BaulRole) => {
    run(() => updateUserRole(baulId, personaId, role), {
      key: 'role',
      errorMessage: 'Error al actualizar el rol',
    });
  };

  const handleRevokeAccess = async (): Promise<boolean> => {
    const result = await run(() => revokeAccess(baulId, personaId), {
      key: 'revoke',
      errorMessage: 'Error al quitar el acceso',
    });
    if (result.ok) navigate(`/baules/${baulId}`, { state: { activeTab: returnTab } });
    return result.ok;
  };

  return (
    <>
      <PersonaDetailScreen
        persona={persona}
        permissions={personaPermissions}
        onBack={() => navigate(`/baules/${baulId}`, { state: { activeTab: returnTab } })}
        onEditInfo={() => setIsEditingInfo(true)}
        onEditBiografia={() => setIsEditingBiografia(true)}
        onUploadAvatar={handleUploadAvatar}
        isUploadingAvatar={isPending('avatar')}
        onShareInvite={handleShareInvite}
        onChangeRole={handleChangeRole}
        onRevokeAccess={handleRevokeAccess}
        photos={personaPhotos[personaId] || []}
        onSelectPhoto={(photo) => navigate(`/baules/${baulId}/personas/${personaId}/foto/${photo.id}`, {
          state: { backgroundLocation: location },
        })}
      />
      {isEditingInfo && (
        <EditPersonaInfoModal
          persona={persona}
          onCancel={() => setIsEditingInfo(false)}
          onSave={handleSaveInfo}
          isSubmitting={isPending('save')}
        />
      )}
      {isEditingBiografia && (
        <EditBiografiaModal
          initialBiografia={persona.biografia || ''}
          onCancel={() => setIsEditingBiografia(false)}
          onSave={handleSaveBiografia}
          isSubmitting={isPending('save')}
        />
      )}
    </>
  );
};
