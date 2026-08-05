// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Persona, Photo } from '@/types';
import { usePersonasStore } from '@/store/usePersonasStore';

vi.mock('react-oidc-context', () => ({
  useAuth: vi.fn(() => ({ isAuthenticated: true })),
}));

vi.mock('@/features/people/useCases', () => ({
  loadPersonas: vi.fn(),
  loadPersonaPhotos: vi.fn(),
}));

import { useAuth } from 'react-oidc-context';
import { loadPersonas, loadPersonaPhotos } from '@/features/people/useCases';
import { usePersonaScope } from './usePersonaScope';

const baulId = 'baul-1';
const personaId = 'persona-1';
const persona = { id: personaId, nickname: 'Abuela' } as Persona;

function photo(overrides: Partial<Photo> = {}): Photo {
  return { id: 'photo-1', thumbnailUrl: '/thumb.jpg', fullUrl: '/full.jpg', recuerdoCount: 0, ...overrides } as Photo;
}

describe('usePersonaScope', () => {
  beforeEach(() => {
    usePersonasStore.getState().reset();
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as ReturnType<typeof useAuth>);
    vi.mocked(loadPersonas).mockReset().mockResolvedValue(undefined);
    vi.mocked(loadPersonaPhotos).mockReset().mockResolvedValue(undefined);
  });

  it('does nothing when baulId or personaId is missing', () => {
    const { result } = renderHook(() => usePersonaScope(undefined, personaId));

    expect(result.current.isLoading).toBe(false);
    expect(loadPersonas).not.toHaveBeenCalled();
    expect(loadPersonaPhotos).not.toHaveBeenCalled();
  });

  it('loads personas and personaPhotos together when neither is cached', async () => {
    vi.mocked(loadPersonas).mockImplementation(async () => {
      usePersonasStore.setState({ personas: { [baulId]: [persona] } });
    });
    vi.mocked(loadPersonaPhotos).mockImplementation(async () => {
      usePersonasStore.setState({ personaPhotos: { [personaId]: [photo()] } });
    });

    const { result } = renderHook(() => usePersonaScope(baulId, personaId));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(loadPersonas).toHaveBeenCalledWith(baulId));
    expect(loadPersonaPhotos).toHaveBeenCalledWith(baulId, personaId);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.persona).toEqual(persona);
    expect(result.current.photos).toEqual([photo()]);
    expect(result.current.loadFailed).toBe(false);
  });

  it('only fetches the piece that is missing', async () => {
    usePersonasStore.setState({ personas: { [baulId]: [persona] } });

    renderHook(() => usePersonaScope(baulId, personaId));

    await waitFor(() => expect(loadPersonaPhotos).toHaveBeenCalledWith(baulId, personaId));
    expect(loadPersonas).not.toHaveBeenCalled();
  });

  it('does not refetch anything once both are already cached', async () => {
    usePersonasStore.setState({ personas: { [baulId]: [persona] }, personaPhotos: { [personaId]: [photo()] } });

    const { result } = renderHook(() => usePersonaScope(baulId, personaId));

    await act(async () => {
      await Promise.resolve();
    });
    expect(loadPersonas).not.toHaveBeenCalled();
    expect(loadPersonaPhotos).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.persona).toEqual(persona);
  });

  it('surfaces loadFailed when the fetch fails, and retry can recover', async () => {
    vi.mocked(loadPersonaPhotos).mockRejectedValueOnce(new Error('network down'));
    usePersonasStore.setState({ personas: { [baulId]: [persona] } });

    const { result } = renderHook(() => usePersonaScope(baulId, personaId));

    await waitFor(() => expect(result.current.loadFailed).toBe(true));
    expect(result.current.isLoading).toBe(false);

    vi.mocked(loadPersonaPhotos).mockImplementationOnce(async () => {
      usePersonasStore.setState({ personaPhotos: { [personaId]: [photo()] } });
    });

    await act(async () => {
      await result.current.retry();
    });

    expect(result.current.loadFailed).toBe(false);
  });

  it('does nothing while unauthenticated', async () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false } as ReturnType<typeof useAuth>);

    renderHook(() => usePersonaScope(baulId, personaId));

    await act(async () => {
      await Promise.resolve();
    });
    expect(loadPersonas).not.toHaveBeenCalled();
    expect(loadPersonaPhotos).not.toHaveBeenCalled();
  });
});
