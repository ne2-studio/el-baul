import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { PersonaDetailScreen } from '@/features/people/components/PersonaDetailScreen';
import { PersonaAvatarPickerModal } from '@/features/people/components/PersonaAvatarPickerModal';
import { EditPersonaInfoModal } from '@/features/people/components/EditPersonaInfoModal';
import { EditBiografiaModal } from '@/features/people/components/EditBiografiaModal';
import { useBaulesStore } from '@/store/useBaulesStore';
import { usePersonasStore } from '@/store/usePersonasStore';
import {
  loadPersonas,
  loadPersonaPhotos,
  updatePersona,
  updatePersonaBiografia,
  uploadPersonaAvatar,
  setPersonaAvatarPhoto,
  updateUserRole,
  revokeAccess,
} from '@/features/people/useCases';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { getPersonaPermissions } from '@/utils/roleUtils';
import { AvatarCrop, api } from '@/api';
import { BaulRole, Photo } from '@/types';
import { openPhotoViewer, photoViewerPath } from '@/features/photos/viewerNavigation';

export const PersonaDetailRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { baulId, personaId } = useParams();
  const returnTab = (location.state as { returnTab?: 'capitulos' | 'personas' | 'recuerdos' } | null)?.returnTab ?? 'personas';
  const { baules } = useBaulesStore();
  const { personas, personaPhotos } = usePersonasStore();
  const { run, isPending } = useAsyncAction();

  const [isLoading, setIsLoading] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [isEditingBiografia, setIsEditingBiografia] = useState(false);
  const [isChangingAvatar, setIsChangingAvatar] = useState(false);

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
    const result = await run(() => updatePersona(baulId, personaId, name, nickname), {
      key: 'save',
      successMessage: 'Ficha actualizada',
      errorMessage: 'Error al actualizar la ficha',
    });
    if (result.ok) setIsEditingInfo(false);
  };

  const handleSaveBiografia = async (biografia: string) => {
    const result = await run(() => updatePersonaBiografia(baulId, personaId, biografia), {
      key: 'save',
      successMessage: 'Biografía actualizada',
      errorMessage: 'Error al actualizar la biografía',
    });
    if (result.ok) setIsEditingBiografia(false);
  };

  const handleUploadAvatar = (file: File, crop: AvatarCrop) => {
    run(() => uploadPersonaAvatar(baulId, personaId, file, crop), {
      key: 'avatar',
      successMessage: 'Foto de perfil actualizada',
      errorMessage: 'Error al subir la foto',
    }).then((result) => {
      if (result.ok) setIsChangingAvatar(false);
    });
  };

  const handleSetAvatarPhoto = (photo: Photo, crop: AvatarCrop) => {
    run(() => setPersonaAvatarPhoto(baulId, personaId, photo, crop), {
      key: 'avatar',
      successMessage: 'Foto de perfil actualizada',
      errorMessage: 'Error al actualizar la foto',
    }).then((result) => {
      if (result.ok) setIsChangingAvatar(false);
    });
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
      successMessage: 'Acceso revocado',
      errorMessage: 'Error al revocar el acceso',
    });
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
        onChangeAvatar={() => setIsChangingAvatar(true)}
        isUploadingAvatar={isPending('avatar')}
        onChangeRole={handleChangeRole}
        onRevokeAccess={handleRevokeAccess}
        photos={personaPhotos[personaId] || []}
        onSelectPhoto={(photo) => openPhotoViewer(navigate, location, photoViewerPath(`/baules/${baulId}/personas/${personaId}`, photo.id))}
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
      {isChangingAvatar && (
        <PersonaAvatarPickerModal
          personaName={persona.nickname}
          taggedPhotos={personaPhotos[personaId] || []}
          fetchPage={(skip, take) => api.photos.getPage(baulId, { skip, take })}
          onSelectExisting={handleSetAvatarPhoto}
          onUploadNew={handleUploadAvatar}
          onCancel={() => setIsChangingAvatar(false)}
          isSubmitting={isPending('avatar')}
        />
      )}
    </>
  );
};
