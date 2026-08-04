import { Capacitor } from '@capacitor/core';
import * as Sentry from '@sentry/react';
import { IncomingShare, SharedFile } from '@/features/sharing/native/shareReceiver';
import { materializeSharedPhoto, SelectedPhoto } from '@/features/photos/uploadFlow';
import { useIncomingShareStore } from '@/store/useIncomingShareStore';
import { AvatarCrop, api } from '@/api';
import { BaulRole, Photo } from '@/types';
import { usePersonasStore } from '@/store/usePersonasStore';
import { useBaulesStore } from '@/store/useBaulesStore';
import { loadPersonaPhotos } from '@/features/people/useCases';

// The native plugin hands us absolute file paths under app-private storage; convertFileSrc
// turns those into capacitor://localhost/_capacitor_file_/... URLs the WebView can fetch.
// Reported separately per file (rather than letting one bad share item fail the whole
// batch) so we can see in Sentry exactly which file/mimeType/size trips this up.
async function toSelectedPhoto(sharedFile: SharedFile): Promise<SelectedPhoto | null> {
  const webPath = Capacitor.convertFileSrc(sharedFile.path);

  try {
    const response = await fetch(webPath);
    if (!response.ok) {
      throw new Error(`Local share file fetch failed: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    if (blob.size === 0) {
      throw new Error('Local share file fetch returned an empty blob');
    }

    return materializeSharedPhoto(blob, sharedFile.name, sharedFile.mimeType);
  } catch (error) {
    Sentry.captureException(error, {
      extra: { name: sharedFile.name, mimeType: sharedFile.mimeType, path: sharedFile.path },
    });
    return null;
  }
}

export async function loadShare(share: IncomingShare): Promise<void> {
  const results = await Promise.all(share.files.map(toSelectedPhoto));
  const selectedPhotos = results.filter((photo): photo is SelectedPhoto => photo !== null);

  if (selectedPhotos.length === 0 && share.files.length > 0) {
    Sentry.captureMessage('Incoming share had files but none could be loaded', {
      extra: { fileCount: share.files.length },
    });
  }

  useIncomingShareStore.setState({ share, selectedPhotos });
}

export function clear(): void {
  useIncomingShareStore.setState({ share: null, selectedPhotos: [] });
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
  usePersonasStore.setState((state) => {
    const currentPhotos = state.personaPhotos[personaId] || [];
    const hasPhoto = currentPhotos.some((p) => p.id === photo.id);
    return {
      personas: {
        ...state.personas,
        [baulId]: (state.personas[baulId] || []).map((u) => (u.id === personaId ? updated : u)),
      },
      personaPhotos: hasPhoto
        ? state.personaPhotos
        : { ...state.personaPhotos, [personaId]: [photo, ...currentPhotos] },
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

export async function loadRemovalRequests(baulId: string): Promise<void> {
  const removalRequests = await api.baules.getRemovalRequests(baulId);
  usePersonasStore.setState((state) => ({ removalRequests: { ...state.removalRequests, [baulId]: removalRequests } }));
}

export async function removePhoto(baulId: string, requestId: string, photoId: string): Promise<void> {
  await api.baules.approveRemovalRequest(baulId, requestId);
  useBaulesStore.getState().removePhotoFromCaches(photoId);
  usePersonasStore.setState((state) => ({
    removalRequests: {
      ...state.removalRequests,
      [baulId]: (state.removalRequests[baulId] || []).filter((r) => r.id !== requestId),
    },
  }));
}

export async function keepPhoto(baulId: string, requestId: string): Promise<void> {
  await api.baules.rejectRemovalRequest(baulId, requestId);
  usePersonasStore.setState((state) => ({
    removalRequests: {
      ...state.removalRequests,
      [baulId]: (state.removalRequests[baulId] || []).filter((r) => r.id !== requestId),
    },
  }));
}
