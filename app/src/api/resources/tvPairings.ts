import { TvPairing, TvPairingStatus } from '../../types';
import { path, type JsonRequest, type JsonResponse, type PathTemplate } from '../contract';
import { get, post } from '../http';

const TV_PAIRINGS = '/api/tv-pairings' satisfies PathTemplate;
const TV_PAIRING = '/api/tv-pairings/{code}' satisfies PathTemplate;
const CLAIM_TV_PAIRING = '/api/tv-pairings/{code}/claim' satisfies PathTemplate;

export const tvPairingsApi = {
  // Anonymous — called from the TV's own landing page before anyone has scanned anything (see
  // TvLandingRoute).
  create: async () => new TvPairing(await post<JsonResponse<typeof TV_PAIRINGS, 'post'>>(TV_PAIRINGS)),
  // Anonymous — polled by the TV itself while it waits for a phone to claim the code.
  getStatus: async (code: string) =>
    new TvPairingStatus(await get<JsonResponse<typeof TV_PAIRING, 'get'>>(path(TV_PAIRING, { code }))),
  claim: (code: string, baulId: string) =>
    post<void>(
      path(CLAIM_TV_PAIRING, { code }),
      { baulId } satisfies JsonRequest<typeof CLAIM_TV_PAIRING, 'post'>
    ),
};
