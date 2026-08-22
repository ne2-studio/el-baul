// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Persona, Photo } from '@/types';
import { usePersonasStore } from '@/store/usePersonasStore';
import { usePhotosStore } from '@/store/usePhotosStore';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';

vi.mock('react-oidc-context', () => ({
  useAuth: vi.fn(() => ({ isAuthenticated: true })),
}));

vi.mock('@/api', () => ({
  api: { baules: { getPersonaScope: vi.fn() } },
}));

import { useAuth } from 'react-oidc-context';
import { api } from '@/api';
import { usePersonaScope } from './usePersonaScope';

const baulId = 'baul-1';
const personaId = 'persona-1';
const persona = { id: personaId, nickname: 'Abuela' } as Persona;

function photo(overrides: Partial<Photo> = {}): Photo {
  return { id: 'photo-1', thumbnailUrl: '/thumb.jpg', fullUrl: '/full.jpg', recuerdoCount: 0, ...overrides } as Photo;
}

// Seeds both halves of the normalized photo cache: the persona's id list (usePersonasStore) and
// the canonical objects it resolves against (usePhotosStore) — see usePhotosStore.hydratePhotos.
function seedPersonaPhotos(forPersonaId: string, photos: Photo[]): void {
  usePhotosStore.getState().upsertPhotos(photos);
  usePersonasStore.setState((state) => ({
    personaPhotos: { ...state.personaPhotos, [forPersonaId]: photos.map((p) => p.id) },
  }));
}

describe('usePersonaScope', () => {
  beforeEach(() => {
    // React logs errors thrown/rejected inside effects to console.error even when the
    // hook handles them correctly (see loadFailed tests below) — silence the noise.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    usePersonasStore.getState().reset();
    usePhotosStore.getState().reset();
    useRecuerdosStore.getState().reset();
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as ReturnType<typeof useAuth>);
    vi.mocked(api.baules.getPersonaScope).mockReset().mockResolvedValue({
      personas: [persona], personaPhotos: [], baulRecuerdos: [],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does nothing when baulId or personaId is missing', () => {
    const { result } = renderHook(() => usePersonaScope(undefined, personaId));

    expect(result.current.isLoading).toBe(false);
    expect(api.baules.getPersonaScope).not.toHaveBeenCalled();
  });

  it('loads personas, personaPhotos and baúl recuerdos together when none are cached', async () => {
    // Deferred via a microtask (not a synchronous mock body) so isLoading — derived straight
    // from the store — can actually be observed as true before this resolves, same as a real
    // network call would behave.
    vi.mocked(api.baules.getPersonaScope).mockImplementation(() => Promise.resolve().then(() => ({
      personas: [persona], personaPhotos: [photo()], baulRecuerdos: [],
    })));

    const { result } = renderHook(() => usePersonaScope(baulId, personaId));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(api.baules.getPersonaScope).toHaveBeenCalledWith(baulId, personaId));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.persona).toEqual(persona);
    expect(result.current.photos).toEqual([photo()]);
    expect(result.current.loadFailed).toBe(false);
  });

  it('does not refetch anything once everything is already cached', async () => {
    usePersonasStore.setState({ personas: { [baulId]: [persona] } });
    seedPersonaPhotos(personaId, [photo()]);
    useRecuerdosStore.setState({ baulRecuerdos: { [baulId]: [] } });

    const { result } = renderHook(() => usePersonaScope(baulId, personaId));

    await act(async () => {
      await Promise.resolve();
    });
    expect(api.baules.getPersonaScope).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.persona).toEqual(persona);
  });

  it('surfaces loadFailed when the fetch fails, and retry can recover', async () => {
    vi.mocked(api.baules.getPersonaScope).mockRejectedValueOnce(new Error('network down'));

    const { result } = renderHook(() => usePersonaScope(baulId, personaId));

    await waitFor(() => expect(result.current.loadFailed).toBe(true));
    expect(result.current.isLoading).toBe(false);

    vi.mocked(api.baules.getPersonaScope).mockResolvedValueOnce({
      personas: [persona], personaPhotos: [photo()], baulRecuerdos: [],
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
    expect(api.baules.getPersonaScope).not.toHaveBeenCalled();
  });

  // Regression: navigating straight from one persona's ficha to another (same route, only
  // personaId changes) must not have the new persona's fetch silently dropped because the
  // previous persona's fetch — for a *different* id — is still in flight.
  it('fetches the new persona even while the previous persona\'s fetch is still in flight', async () => {
    const personaA = { ...persona, id: 'persona-a' };
    const personaB = { ...persona, id: 'persona-b' };
    let resolveA: () => void = () => {};

    vi.mocked(api.baules.getPersonaScope).mockImplementation((_baulId: string, pId: string) => {
      if (pId === personaA.id) {
        return new Promise((resolve) => {
          resolveA = () => resolve({ personas: [personaA, personaB], personaPhotos: [photo()], baulRecuerdos: [] });
        });
      }
      return Promise.resolve({ personas: [personaA, personaB], personaPhotos: [photo()], baulRecuerdos: [] });
    });

    const { result, rerender } = renderHook(
      ({ personaId }: { personaId: string }) => usePersonaScope(baulId, personaId),
      { initialProps: { personaId: personaA.id } }
    );

    expect(result.current.isLoading).toBe(true);

    rerender({ personaId: personaB.id });

    await waitFor(() => expect(api.baules.getPersonaScope).toHaveBeenCalledWith(baulId, personaB.id));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.photos).toEqual([photo()]);
    expect(result.current.loadFailed).toBe(false);

    resolveA();
  });

  it('ignores a failed fetch for the previous persona after navigating to a loaded one', async () => {
    const personaA = { ...persona, id: 'persona-a' };
    const personaB = { ...persona, id: 'persona-b' };
    let rejectA: (error: Error) => void = () => {};

    vi.mocked(api.baules.getPersonaScope).mockImplementation((_baulId: string, pId: string) => {
      if (pId === personaA.id) {
        return new Promise((_resolve, reject) => {
          rejectA = reject;
        });
      }
      return Promise.resolve({
        personas: [personaA, personaB], personaPhotos: [photo({ id: `photo-${pId}` })], baulRecuerdos: [],
      });
    });

    const { result, rerender } = renderHook(
      ({ personaId }: { personaId: string }) => usePersonaScope(baulId, personaId),
      { initialProps: { personaId: personaA.id } }
    );

    rerender({ personaId: personaB.id });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      rejectA(new Error('old persona failed'));
      await Promise.resolve();
    });

    expect(result.current.persona?.id).toBe(personaB.id);
    expect(result.current.photos).toEqual([photo({ id: `photo-${personaB.id}` })]);
    expect(result.current.loadFailed).toBe(false);
  });
});
