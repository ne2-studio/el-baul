import { AvatarCrop, api } from '@/api';
import { BaulRole, Photo } from '@/types';
import { usePersonasStore } from '@/store/usePersonasStore';
import { usePhotosStore } from '@/store/usePhotosStore';

// Its only caller is PersonasTabContainer (features/people/containers) — moved here from
// features/baules/useCases when that container took over the baúl's Personas tab.
export async function createPersona(baulId: string, nickname: string): Promise<void> {
  const persona = await api.baules.createPersona(baulId, nickname);
  usePersonasStore.setState((state) => ({
    personas: { ...state.personas, [baulId]: [...(state.personas[baulId] || []), persona] },
  }));
}

export async function loadPersonas(baulId: string): Promise<void> {
  const personas = await api.baules.getPersonas(baulId);
  usePersonasStore.setState((state) => ({ personas: { ...state.personas, [baulId]: personas } }));
}

export async function loadPersonaPhotos(baulId: string, personaId: string): Promise<void> {
  const photos = await api.baules.getPersonaPhotos(baulId, personaId);
  usePhotosStore.getState().upsertPhotos(photos);
  usePersonasStore.setState((state) => ({
    personaPhotos: { ...state.personaPhotos, [personaId]: photos.map((photo) => photo.id) },
  }));
}

export async function updatePersona(baulId: string, personaId: string, name: string, nickname: string): Promise<void> {
  const updated = await api.baules.updatePersona(baulId, personaId, name, nickname);
  usePersonasStore.setState((state) => ({
    personas: {
      ...state.personas,
      [baulId]: (state.personas[baulId] || []).map((u) => (u.id === personaId ? updated : u)),
    },
  }));
}

export async function updatePersonaBiografia(baulId: string, personaId: string, biografia: string): Promise<void> {
  const updated = await api.baules.updatePersonaBiografia(baulId, personaId, biografia);
  usePersonasStore.setState((state) => ({
    personas: {
      ...state.personas,
      [baulId]: (state.personas[baulId] || []).map((u) => (u.id === personaId ? updated : u)),
    },
  }));
}

export async function uploadPersonaAvatar(baulId: string, personaId: string, file: File, crop: AvatarCrop): Promise<void> {
  const updated = await api.baules.uploadPersonaAvatar(baulId, personaId, file, crop);
  usePersonasStore.setState((state) => ({
    personas: {
      ...state.personas,
      [baulId]: (state.personas[baulId] || []).map((u) => (u.id === personaId ? updated : u)),
    },
  }));
  loadPersonaPhotos(baulId, personaId).catch(() => undefined);
}

export async function setPersonaAvatarPhoto(baulId: string, personaId: string, photo: Photo, crop: AvatarCrop): Promise<void> {
  const updated = await api.baules.setPersonaAvatarPhoto(baulId, personaId, photo.id, crop);
  usePhotosStore.getState().upsertPhotos([photo]);
  usePersonasStore.setState((state) => {
    const currentPhotoIds = state.personaPhotos[personaId] || [];
    const hasPhoto = currentPhotoIds.includes(photo.id);
    return {
      personas: {
        ...state.personas,
        [baulId]: (state.personas[baulId] || []).map((u) => (u.id === personaId ? updated : u)),
      },
      personaPhotos: hasPhoto
        ? state.personaPhotos
        : { ...state.personaPhotos, [personaId]: [photo.id, ...currentPhotoIds] },
    };
  });
}

// Optimista: el <select> de rol está controlado por este valor, así que sin aplicar
// el cambio antes del await se ve "rebotar" al valor anterior mientras se espera al
// servidor. Si la petición falla, se revierte al snapshot previo.
export async function updateUserRole(baulId: string, personaId: string, role: BaulRole): Promise<void> {
  const previous = usePersonasStore.getState().personas[baulId] || [];
  usePersonasStore.setState((state) => ({
    personas: {
      ...state.personas,
      [baulId]: previous.map((u) => (
        u.id === personaId
          ? { ...u, role, status: u.status === 'sin_acceso' ? 'pending' : u.status }
          : u
      )),
    },
  }));
  try {
    await api.baules.updatePersonaRole(baulId, personaId, role);
  } catch (error) {
    usePersonasStore.setState((state) => ({ personas: { ...state.personas, [baulId]: previous } }));
    throw error;
  }
}

export async function revokeAccess(baulId: string, personaId: string): Promise<void> {
  await api.baules.revokeAccess(baulId, personaId);
  usePersonasStore.setState((state) => ({
    personas: {
      ...state.personas,
      [baulId]: (state.personas[baulId] || []).map((persona) =>
        persona.id === personaId
          ? { ...persona, email: undefined, role: 'sin_acceso', status: 'sin_acceso' }
          : persona
      ),
    },
  }));
}
