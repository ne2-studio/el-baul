import type { JsonResponse, PathTemplate } from '../contract';
import { get } from '../http';

const APP_CONFIG = '/api/app-config' satisfies PathTemplate;

export const appConfigApi = {
  get: () => get<JsonResponse<typeof APP_CONFIG, 'get'>>(APP_CONFIG),
};
