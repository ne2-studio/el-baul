import { PhotoCrop, api } from '@/api';
import { BaulRole, Persona, Photo } from '@/types';
import { usePersonasStore } from '@/store/usePersonasStore';
import { usePhotosStore } from '@/store/usePhotosStore';
import { withOptimisticUpdate } from '@/store/withOptimisticUpdate';

// Its callers are BaulPersonasTabContainer (features/people/containers) and
// InvitarFamiliaRoute (features/sharing/routes) — moved here from features/baules/useCases
// when the former took over the baúl's Personas tab. Returns the created Persona so
// InvitarFamiliaRoute can immediately start its invite flow without a second round trip.
export async function createPersona(baulId: string, nickname: string): Promise<Persona> {
  const persona = await api.baules.createPersona(baulId, nickname);
  usePersonasStore.setState((state) => ({
    personas: { ...state.personas, [baulId]: [...(state.personas[baulId] || []), persona] },
  }));
  return persona;
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

export async function uploadPersonaAvatar(baulId: string, personaId: string, file: File, crop: PhotoCrop): Promise<void> {
  const updated = await api.baules.uploadPersonaAvatar(baulId, personaId, file, crop);
  usePersonasStore.setState((state) => ({
    personas: {
      ...state.personas,
      [baulId]: (state.personas[baulId] || []).map((u) => (u.id === personaId ? updated : u)),
    },
  }));
  loadPersonaPhotos(baulId, personaId).catch(() => undefined);
}

export async function setPersonaAvatarPhoto(baulId: string, personaId: string, photo: Photo, crop: PhotoCrop): Promise<void> {
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
// servidor. Si la petición falla, se revierte al snapshot previo (ver withOptimisticUpdate
// para el detalle de snapshot/apply/rollback compartido).
export async function updateUserRole(baulId: string, personaId: string, role: BaulRole): Promise<void> {
  await withOptimisticUpdate({
    getSnapshot: () => usePersonasStore.getState().personas[baulId] || [],
    applyOptimistic: () => usePersonasStore.setState((state) => ({
      personas: {
        ...state.personas,
        [baulId]: (state.personas[baulId] || []).map((u) => (u.id === personaId ? { ...u, role } : u)),
      },
    })),
    rollback: (previous) => usePersonasStore.setState((state) => ({ personas: { ...state.personas, [baulId]: previous } })),
    operation: () => api.baules.updatePersonaRole(baulId, personaId, role),
  });
}

// "Revocar acceso" — clears the account link (and its invite token, server-side) but leaves
// the persona's role untouched: there is no more sin_acceso status, the row just falls back
// to Pending and can be re-invited normally (see Persona.RevokeAccess).
export async function revokeAccess(baulId: string, personaId: string): Promise<void> {
  await api.baules.revokeAccess(baulId, personaId);
  usePersonasStore.setState((state) => ({
    personas: {
      ...state.personas,
      [baulId]: (state.personas[baulId] || []).map((persona) =>
        persona.id === personaId
          ? { ...persona, email: undefined, status: 'pending' }
          : persona
      ),
    },
  }));
}
