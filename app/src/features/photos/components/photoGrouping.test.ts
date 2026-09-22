import { describe, expect, it } from 'vitest';
import { groupPhotosByYear } from './photoGrouping';
import type { GalleryPhoto } from '@/types';

function photo(id: string, year: number, month: number, day: number): GalleryPhoto {
  return { id, thumbnailUrl: '', date: { year, month, day } } as GalleryPhoto;
}

describe('groupPhotosByYear', () => {
  it('defaults to oldest-first groups and days (Mis fotos / Fotos)', () => {
    const photos = [photo('a', 2023, 1, 1), photo('b', 2024, 3, 1), photo('c', 2023, 1, 2)];

    const groups = groupPhotosByYear(photos);

    expect(groups.map((g) => g.label)).toEqual(['Enero 2023', 'Marzo 2024']);
    expect(groups[0].photos.map((p) => p.id)).toEqual(['a', 'c']);
  });

  it('with order "desc" keeps newest-first groups and days, matching device-photo pagination', () => {
    const photos = [photo('a', 2023, 1, 1), photo('b', 2024, 3, 1), photo('c', 2023, 1, 2)];

    const groups = groupPhotosByYear(photos, 'desc');

    expect(groups.map((g) => g.label)).toEqual(['Marzo 2024', 'Enero 2023']);
    expect(groups[1].photos.map((p) => p.id)).toEqual(['c', 'a']);
  });
});
