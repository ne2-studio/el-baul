import { Photo } from '../../types';
import { path, type JsonResponse, type PathTemplate } from '../contract';
import { get } from '../http';

const CONTRIBUTION_SUGGESTION = '/api/baules/{baulId}/contributions/suggestion' satisfies PathTemplate;

export type ContributionSuggestion = { type: 'tag' | 'memory'; photo: Photo };

// Único punto de decisión de qué recomendación de contribución (si alguna) ofrecer al entrar a un
// baúl — tipo, foto y probabilidad viven en el backend (dominio Contributions), no aquí. Ver
// ContributionSuggestionGateContainer, el único llamador.
export const contributionsApi = {
  getSuggestion: async (baulId: string): Promise<ContributionSuggestion | null> => {
    const dto = await get<JsonResponse<typeof CONTRIBUTION_SUGGESTION, 'get'>>(path(CONTRIBUTION_SUGGESTION, { baulId }));
    return dto ? { type: dto.type as 'tag' | 'memory', photo: new Photo(dto.photo) } : null;
  },
};
