import { describe, expect, it } from 'vitest';
import { makeLooseChapterView } from './looseChapterView';

describe('makeLooseChapterView', () => {
  it('builds the virtual chapter model only when photos exist', () => {
    expect(makeLooseChapterView([])).toBeNull();

    const photos = Array.from({ length: 10 }, (_, index) => ({ thumbnailUrl: `photo-${index}-thumb` }));
    expect(makeLooseChapterView(photos)).toEqual({
      id: null,
      name: 'Fotos sueltas',
      photoCount: 10,
      coverPhotoUrls: photos.slice(0, 9).map((photo) => photo.thumbnailUrl),
    });
  });
});
