import { beforeEach, describe, expect, it } from 'vitest';
import { Photo } from '@/types';
import { hydratePhotos, usePhotosStore } from './usePhotosStore';

function newPhoto(id: string, overrides: Partial<ConstructorParameters<typeof Photo>[0]> = {}): Photo {
  return new Photo({
    id,
    baulId: 'baul-1',
    thumbnailUrl: `${id}-thumb`,
    fullUrl: `${id}-full`,
    uploadedBy: 'user-1',
    createdAt: new Date().toISOString(),
    recuerdoCount: 0,
    canDelete: false,
    canRequestRemoval: true,
    alreadyExisted: false,
    ...overrides,
  });
}

describe('usePhotosStore', () => {
  beforeEach(() => {
    usePhotosStore.setState({ photosById: {} });
  });

  it('upsertPhotos merges by id without losing entries not touched by this call', () => {
    const photoA = newPhoto('photo-a');
    const photoB = newPhoto('photo-b');
    usePhotosStore.getState().upsertPhotos([photoA]);

    usePhotosStore.getState().upsertPhotos([photoB]);

    expect(usePhotosStore.getState().photosById).toEqual({ 'photo-a': photoA, 'photo-b': photoB });
  });

  it('upsertPhotos overwrites an existing entry for the same id with the newer fields', () => {
    const original = newPhoto('photo-a', { recuerdoCount: 0 });
    const updated = newPhoto('photo-a', { recuerdoCount: 3 });
    usePhotosStore.getState().upsertPhotos([original]);

    usePhotosStore.getState().upsertPhotos([updated]);

    expect(usePhotosStore.getState().photosById['photo-a'].recuerdoCount).toBe(3);
  });

  it('removePhoto deletes the entry and leaves the rest untouched', () => {
    const photoA = newPhoto('photo-a');
    const photoB = newPhoto('photo-b');
    usePhotosStore.getState().upsertPhotos([photoA, photoB]);

    usePhotosStore.getState().removePhoto('photo-a');

    expect(usePhotosStore.getState().photosById).toEqual({ 'photo-b': photoB });
  });

  it('reset clears every cached photo', () => {
    usePhotosStore.getState().upsertPhotos([newPhoto('photo-a')]);

    usePhotosStore.getState().reset();

    expect(usePhotosStore.getState().photosById).toEqual({});
  });
});

describe('hydratePhotos', () => {
  it('returns undefined when the id list itself is undefined (not yet loaded)', () => {
    expect(hydratePhotos(undefined, {})).toBeUndefined();
  });

  it('resolves ids to their current Photo, preserving list order', () => {
    const photoA = newPhoto('photo-a');
    const photoB = newPhoto('photo-b');

    expect(hydratePhotos(['photo-b', 'photo-a'], { 'photo-a': photoA, 'photo-b': photoB })).toEqual([photoB, photoA]);
  });

  it('drops an id that no longer resolves instead of returning a hole', () => {
    const photoA = newPhoto('photo-a');

    expect(hydratePhotos(['photo-a', 'deleted-elsewhere'], { 'photo-a': photoA })).toEqual([photoA]);
  });
});
