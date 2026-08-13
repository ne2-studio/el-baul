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

vi.mock('@/features/people/useCases', () => ({
  loadPersonas: vi.fn(),
  loadPersonaPhotos: vi.fn(),
}));

vi.mock('@/features/memories/useCases', () => ({
  loadBaulRecuerdos: vi.fn(),
}));

import { useAuth } from 'react-oidc-context';
import { loadPersonas, loadPersonaPhotos } from '@/features/people/useCases';
import { loadBaulRecuerdos } from '@/features/memories/useCases';
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
    vi.mocked(loadPersonas).mockReset().mockResolvedValue(undefined);
    vi.mocked(loadPersonaPhotos).mockReset().mockResolvedValue(undefined);
    vi.mocked(loadBaulRecuerdos).mockReset().mockImplementation(async (id: string) => {
      useRecuerdosStore.setState((state) => ({ baulRecuerdos: { ...state.baulRecuerdos, [id]: [] } }));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does nothing when baulId or personaId is missing', () => {
    const { result } = renderHook(() => usePersonaScope(undefined, personaId));

    expect(result.current.isLoading).toBe(false);
    expect(loadPersonas).not.toHaveBeenCalled();
    expect(loadPersonaPhotos).not.toHaveBeenCalled();
  });

  it('loads personas, personaPhotos and baúl recuerdos together when none are cached', async () => {
    // Deferred via a microtask (not a synchronous mock body) so isLoading — now derived
    // straight from the store — can actually be observed as true before these resolve, same
    // as a real network call would behave.
    vi.mocked(loadPersonas).mockImplementation(() => Promise.resolve().then(() => {
      usePersonasStore.setState({ personas: { [baulId]: [persona] } });
    }));
    vi.mocked(loadPersonaPhotos).mockImplementation(() => Promise.resolve().then(() => {
      seedPersonaPhotos(personaId, [photo()]);
    }));

    const { result } = renderHook(() => usePersonaScope(baulId, personaId));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(loadPersonas).toHaveBeenCalledWith(baulId));
    expect(loadPersonaPhotos).toHaveBeenCalledWith(baulId, personaId);
    expect(loadBaulRecuerdos).toHaveBeenCalledWith(baulId);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.persona).toEqual(persona);
    expect(result.current.photos).toEqual([photo()]);
    expect(result.current.loadFailed).toBe(false);
  });

  it('only fetches the pieces that are missing', async () => {
    usePersonasStore.setState({ personas: { [baulId]: [persona] } });
    useRecuerdosStore.setState({ baulRecuerdos: { [baulId]: [] } });

    renderHook(() => usePersonaScope(baulId, personaId));

    await waitFor(() => expect(loadPersonaPhotos).toHaveBeenCalledWith(baulId, personaId));
    expect(loadPersonas).not.toHaveBeenCalled();
    expect(loadBaulRecuerdos).not.toHaveBeenCalled();
  });

  it('does not refetch anything once everything is already cached', async () => {
    usePersonasStore.setState({ personas: { [baulId]: [persona] } });
    seedPersonaPhotos(personaId, [photo()]);
    useRecuerdosStore.setState({ baulRecuerdos: { [baulId]: [] } });

    const { result } = renderHook(() => usePersonaScope(baulId, personaId));

    await act(async () => {
      await Promise.resolve();
    });
    expect(loadPersonas).not.toHaveBeenCalled();
    expect(loadPersonaPhotos).not.toHaveBeenCalled();
    expect(loadBaulRecuerdos).not.toHaveBeenCalled();
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
      seedPersonaPhotos(personaId, [photo()]);
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

  // Regression: navigating straight from one persona's ficha to another (same route, only
  // personaId changes) must not have the new persona's fetch silently dropped because the
  // previous persona's fetch — for a *different* id — is still in flight.
  it('fetches the new persona even while the previous persona\'s fetch is still in flight', async () => {
    const personaA = 'persona-a';
    const personaB = 'persona-b';
    let resolveA: () => void = () => {};

    usePersonasStore.setState({
      personas: { [baulId]: [{ ...persona, id: personaA }, { ...persona, id: personaB }] },
    });
    useRecuerdosStore.setState({ baulRecuerdos: { [baulId]: [] } });

    vi.mocked(loadPersonaPhotos).mockImplementation((_baulId: string, pId: string) => {
      if (pId === personaA) {
        return new Promise<void>((resolve) => {
          resolveA = () => {
            seedPersonaPhotos(personaA, [photo()]);
            resolve();
          };
        });
      }
      return Promise.resolve().then(() => {
        seedPersonaPhotos(pId, [photo()]);
      });
    });

    const { result, rerender } = renderHook(
      ({ personaId }: { personaId: string }) => usePersonaScope(baulId, personaId),
      { initialProps: { personaId: personaA } }
    );

    expect(result.current.isLoading).toBe(true);

    rerender({ personaId: personaB });

    await waitFor(() => expect(loadPersonaPhotos).toHaveBeenCalledWith(baulId, personaB));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.photos).toEqual([photo()]);
    expect(result.current.loadFailed).toBe(false);

    resolveA();
  });

  it('ignores a failed fetch for the previous persona after navigating to a loaded one', async () => {
    const personaA = 'persona-a';
    const personaB = 'persona-b';
    let rejectA: (error: Error) => void = () => {};

    usePersonasStore.setState({
      personas: { [baulId]: [{ ...persona, id: personaA }, { ...persona, id: personaB }] },
    });
    useRecuerdosStore.setState({ baulRecuerdos: { [baulId]: [] } });
    vi.mocked(loadPersonaPhotos).mockImplementation((_baulId: string, pId: string) => {
      if (pId === personaA) {
        return new Promise<void>((_resolve, reject) => {
          rejectA = reject;
        });
      }
      return Promise.resolve().then(() => {
        seedPersonaPhotos(pId, [photo({ id: `photo-${pId}` })]);
      });
    });

    const { result, rerender } = renderHook(
      ({ personaId }: { personaId: string }) => usePersonaScope(baulId, personaId),
      { initialProps: { personaId: personaA } }
    );

    rerender({ personaId: personaB });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      rejectA(new Error('old persona failed'));
      await Promise.resolve();
    });

    expect(result.current.persona?.id).toBe(personaB);
    expect(result.current.photos).toEqual([photo({ id: `photo-${personaB}` })]);
    expect(result.current.loadFailed).toBe(false);
  });
});
