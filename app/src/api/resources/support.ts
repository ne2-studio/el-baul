import type { SupportCategory } from '../../types';
import type { JsonRequest, JsonResponse, PathTemplate } from '../contract';
import { post } from '../http';

const SUPPORT = '/api/support' satisfies PathTemplate;

export const supportApi = {
  submit: async (category: SupportCategory, message: string) => {
    await post<JsonResponse<typeof SUPPORT, 'post'>>(SUPPORT, { category, message } satisfies JsonRequest<typeof SUPPORT, 'post'>);
  },
};
