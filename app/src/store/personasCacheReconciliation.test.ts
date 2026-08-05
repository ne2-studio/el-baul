import { describe, expect, it } from 'vitest';
import { Photo } from '@/types';
import { removePhotoFromPersonaPhotos, updatePhotoInPersonaPhotos } from './personasCacheReconciliation';

function newPhoto(id: string, overrides: Partial<ConstructorParameters<typeof Photo>[0]> = {}): Photo {
  return new Photo({
    id,
    baulId: 'baul-1',
    thumbnailUrl: `${id}-thumb`,
    fullUrl: `${id}-full`,
    uploadedBy: 'user-1',
    createdAt: new Date().toISOString(),
    recuerdoCount: 0,
    ...overrides,
  });
}

describe('personas cache reconciliation', () => {
  it('removePhotoFromPersonaPhotos removes a photo wherever it is tagged, across personas', () => {
    const removed = newPhoto('removed');
    const kept = newPhoto('kept');

    const next = removePhotoFromPersonaPhotos(
      { p1: [removed, kept], p2: [removed], p3: [kept] },
      removed.id
    );

    expect(next).toEqual({ p1: [kept], p2: [], p3: [kept] });
  });

  it('updatePhotoInPersonaPhotos updates a photo wherever it is tagged, across personas', () => {
    const original = newPhoto('photo', { dateYear: 1980 });
    const updated = newPhoto('photo', { dateYear: 1981, dateMonth: 5 });
    const untouched = newPhoto('other');

    const next = updatePhotoInPersonaPhotos(
      { p1: [original, untouched], p2: [original], p3: [untouched] },
      updated
    );

    expect(next.p1).toEqual([updated, untouched]);
    expect(next.p2).toEqual([updated]);
    expect(next.p3).toEqual([untouched]);
  });
});
