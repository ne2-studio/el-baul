import type { JsonResponse } from './contract';

export type { PhotoCrop } from '../types';

export type SharedLinkResponse = JsonResponse<'/api/photos/{photoId}/share', 'post'>;
