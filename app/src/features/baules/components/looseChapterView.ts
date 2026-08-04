export interface LooseChapterView {
  id: null;
  name: 'Fotos sueltas';
  photoCount: number;
  coverPhotoUrls: string[];
}

export function makeLooseChapterView(loosePhotos: Array<{ thumbnailUrl: string }>): LooseChapterView | null {
  if (loosePhotos.length === 0) return null;

  return {
    id: null,
    name: 'Fotos sueltas',
    photoCount: loosePhotos.length,
    coverPhotoUrls: loosePhotos.slice(0, 9).map((photo) => photo.thumbnailUrl),
  };
}
