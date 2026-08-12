import { TaggedPersona } from '../types';
import type { JsonResponse } from './contract';

type TaggedPersonaDto = JsonResponse<'/api/photos/{photoId}/personas', 'get'>[number];

export function toTaggedPersona(data: TaggedPersonaDto): TaggedPersona {
  return {
    id: data.id,
    nickname: data.nickname,
    name: data.name ?? undefined,
    avatarUrl: data.avatarUrl ?? undefined,
  };
}
