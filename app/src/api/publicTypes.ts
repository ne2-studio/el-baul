import type { JsonResponse } from './contract';

export interface AvatarCrop {
  x: number;
  y: number;
  scale: number;
}

export type SharedLinkResponse = JsonResponse<'/api/photos/{photoId}/share', 'post'>;
