import { create } from 'zustand';
import { Photo } from '@/types';

// Filtro de pills de la pestaña "Fotos" de un baúl. 'todas' = todos los capítulos + sueltas;
// 'sin-capitulo' = solo las fotos sueltas.
export type BaulPhotosFilter = 'todas' | 'sin-capitulo';

// Fuente canónica de los campos de una Photo. useBaulesStore (photos/loosePhotos/
// photoBatchPhotos) y usePersonasStore (personaPhotos) solo guardan listas de ids — qué fotos
// pertenecen a qué capítulo/baúl/lote/persona — y se hidratan contra este store con
// hydratePhotos. Esto es lo que permite que borrar o actualizar una foto sea una única
// escritura aquí en vez de un fan-out que recorra cada colección que pudiera referenciarla.
export interface PhotosState {
  photosById: Record<string, Photo>;

  // Filtro activo de la pestaña "Fotos" de un baúl ("Todas" por defecto). Vive aquí, y no en el
  // useState de BaulPhotosTabContainer, para que la elección sobreviva a salir y volver a la
  // pestaña: BaulRoute se desmonta al navegar a un capítulo o al visor de fotos, y la propia
  // tab se desmonta al cambiar de pestaña dentro del baúl. Es estado de sesión en memoria: SIN
  // persist/localStorage, así que una recarga completa vuelve a "Todas". Un único valor para
  // toda la sesión (no se distingue por baulId) — ver BaulPhotosTabContainer.
  baulPhotosFilter: BaulPhotosFilter;

  reset: () => void;

  setBaulPhotosFilter: (filter: BaulPhotosFilter) => void;

  // Fusiona por id, preservando cualquier entrada no incluida en `photos`.
  upsertPhotos: (photos: Photo[]) => void;

  // Borra la entrada. Los ids que quedan huérfanos en las listas de useBaulesStore/
  // usePersonasStore no se purgan explícitamente — hydratePhotos los descarta al no
  // resolver, mismo criterio que ya se aplicaba a photoBatchPhotos (nunca se limpia).
  removePhoto: (photoId: string) => void;
}

export const usePhotosStore = create<PhotosState>((set) => ({
  photosById: {},
  baulPhotosFilter: 'todas',

  reset: () => set({ photosById: {}, baulPhotosFilter: 'todas' }),

  setBaulPhotosFilter: (baulPhotosFilter) => set({ baulPhotosFilter }),

  upsertPhotos: (photos) => set((state) => ({
    photosById: photos.reduce(
      (acc, photo) => ({ ...acc, [photo.id]: photo }),
      { ...state.photosById }
    ),
  })),

  removePhoto: (photoId) => set((state) => {
    const { [photoId]: _removed, ...rest } = state.photosById;
    return { photosById: rest };
  }),
}));

// Hidrata una lista ordenada de ids a sus Photo actuales, descartando cualquier id que ya no
// resuelva (p. ej. borrado en otro sitio desde que se cacheó esta lista). undefined in, undefined
// out — mismo "todavía no se ha cargado" que ya usan las listas de ids que envuelve.
export function hydratePhotos(ids: string[] | undefined, photosById: Record<string, Photo>): Photo[] | undefined {
  if (!ids) return undefined;
  return ids.map((id) => photosById[id]).filter((photo): photo is Photo => photo !== undefined);
}
