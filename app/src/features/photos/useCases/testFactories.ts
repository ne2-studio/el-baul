import { Baul, Chapter, Photo } from '@/types';

export const defaultBaulId = 'baul-1';

export function fakeFile(name: string, { readable = true }: { readable?: boolean } = {}): File {
  return {
    name,
    size: 100,
    type: 'image/jpeg',
    slice: () => ({
      arrayBuffer: () =>
        readable ? Promise.resolve(new ArrayBuffer(0)) : Promise.reject(new Error('cannot read')),
    }),
  } as unknown as File;
}

export function newBaul(
  overrides: Partial<ConstructorParameters<typeof Baul>[0]> = {},
  baulId = defaultBaulId
): Baul {
  const now = new Date().toISOString();
  return new Baul({
    id: baulId,
    name: 'Baúl',
    chapterCount: 1,
    createdAt: now,
    updatedAt: now,
    role: 'administrador',
    isCustodio: true,
    memberCount: 1,
    ...overrides,
  });
}

export function newChapter(
  id = 'chapter-1',
  overrides: Partial<ConstructorParameters<typeof Chapter>[0]> = {},
  baulId = defaultBaulId
): Chapter {
  const now = new Date().toISOString();
  return new Chapter({
    id,
    baulId,
    name: 'Capítulo',
    photoCount: 0,
    createdAt: now,
    updatedAt: now,
    recuerdoCount: 0,
    undatedPhotoCount: 0,
    ...overrides,
  });
}

export function newPhoto(
  id: string,
  overrides: Partial<ConstructorParameters<typeof Photo>[0]> = {},
  baulId = defaultBaulId
): Photo {
  return new Photo({
    id,
    baulId,
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
