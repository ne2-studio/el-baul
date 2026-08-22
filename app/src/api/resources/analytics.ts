import type { ClientPlatform } from '@/utils/platform';
import type { EntrySource } from '@/utils/entrySource';
import type { JsonRequest, JsonResponse, PathTemplate } from '../contract';
import { post } from '../http';

const SESSION_OPEN = '/api/analytics/session-open' satisfies PathTemplate;

export const analyticsApi = {
  reportSessionOpen: async (platform: ClientPlatform, entrySource: EntrySource) => {
    await post<JsonResponse<typeof SESSION_OPEN, 'post'>>(
      SESSION_OPEN,
      { platform, entrySource } satisfies JsonRequest<typeof SESSION_OPEN, 'post'>
    );
  },
};
