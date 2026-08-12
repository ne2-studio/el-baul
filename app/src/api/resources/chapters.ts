import { Chapter } from '../../types';
import { path, type JsonRequest, type JsonResponse, type PathTemplate } from '../contract';
import { del, get, post, put } from '../http';

const BAUL_CHAPTERS = '/api/baules/{baulId}/chapters' satisfies PathTemplate;
const BAUL_CHAPTER = '/api/baules/{baulId}/chapters/{chapterId}' satisfies PathTemplate;
const CHAPTER_COVER = '/api/baules/{baulId}/chapters/{chapterId}/cover' satisfies PathTemplate;

type ChapterDto = JsonResponse<typeof BAUL_CHAPTER, 'get'>;

const chaptersPath = (baulId: string) => path(BAUL_CHAPTERS, { baulId });
const chapterPath = (baulId: string, chapterId: string) => path(BAUL_CHAPTER, { baulId, chapterId });

export const chaptersApi = {
  getAll: async (baulId: string) => (await get<JsonResponse<typeof BAUL_CHAPTERS, 'get'>>(chaptersPath(baulId))).map((a) => new Chapter(a)),
  create: async (baulId: string, name: string) =>
    new Chapter(await post<ChapterDto>(chaptersPath(baulId), { name } satisfies JsonRequest<typeof BAUL_CHAPTERS, 'post'>)),
  setCover: async (baulId: string, chapterId: string, photoId: string) =>
    new Chapter(await put<ChapterDto>(path(CHAPTER_COVER, { baulId, chapterId }), { photoId } satisfies JsonRequest<typeof CHAPTER_COVER, 'put'>)),
  update: async (baulId: string, chapterId: string, name: string) =>
    new Chapter(await put<ChapterDto>(chapterPath(baulId, chapterId), { name } satisfies JsonRequest<typeof BAUL_CHAPTER, 'put'>)),
  delete: (baulId: string, chapterId: string) => del<void>(chapterPath(baulId, chapterId)),
};
