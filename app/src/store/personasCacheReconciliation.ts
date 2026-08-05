import { Photo } from '@/types';

// Sibling of baulesCacheReconciliation's removePhotoFromAllCaches/updatePhotoInAllCaches, for
// the personaPhotos cache (keyed by personaId, not chapterId/baulId). A photo can be tagged
// with several personas at once, so both search across every key rather than requiring the
// caller to know which persona(s) had it cached.

export function removePhotoFromPersonaPhotos(
  personaPhotos: Record<string, Photo[]>,
  photoId: string
): Record<string, Photo[]> {
  return Object.fromEntries(
    Object.entries(personaPhotos).map(([personaId, photos]) => [
      personaId,
      photos.filter((photo) => photo.id !== photoId),
    ])
  );
}

export function updatePhotoInPersonaPhotos(
  personaPhotos: Record<string, Photo[]>,
  updatedPhoto: Photo
): Record<string, Photo[]> {
  return Object.fromEntries(
    Object.entries(personaPhotos).map(([personaId, photos]) => [
      personaId,
      photos.map((photo) => (photo.id === updatedPhoto.id ? updatedPhoto : photo)),
    ])
  );
}
