// @vitest-environment jsdom
import { useEffect, useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Persona, Photo } from '@/types';
import { usePersonasStore } from '@/store/usePersonasStore';
import { ContributionSuggestionContainer } from './ContributionSuggestionContainer';

vi.mock('@/api', () => ({
  api: { photos: { getUntaggedSuggestion: vi.fn() } },
}));
vi.mock('@/features/photos/useCases', () => ({
  setTaggedPersonas: vi.fn(),
}));

import { api } from '@/api';
import { setTaggedPersonas } from '@/features/photos/useCases';

const baulId = 'baul-1';

function persona(overrides: Partial<Persona> = {}): Persona {
  return { id: 'p1', baulId, nickname: 'Abuela', status: 'active', role: 'colaborador', invitedDate: '', ...overrides } as Persona;
}

function photo(overrides: Partial<Photo> = {}): Photo {
  return { id: 'photo-1', thumbnailUrl: '/thumb.jpg', fullUrl: '/full.jpg', recuerdoCount: 0, ...overrides } as Photo;
}

describe('ContributionSuggestionContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePersonasStore.getState().reset();
    usePersonasStore.setState({ personas: { [baulId]: [persona()] } });
  });

  it('resolves immediately without rendering anything when there is no candidate photo', async () => {
    vi.mocked(api.photos.getUntaggedSuggestion).mockResolvedValue(null);
    const onResolved = vi.fn();

    const { container } = render(<ContributionSuggestionContainer baulId={baulId} onResolved={onResolved} />);

    await waitFor(() => expect(onResolved).toHaveBeenCalledTimes(1));
    expect(container).toBeEmptyDOMElement();
  });

  it('resolves without rendering anything when the suggestion fetch fails', async () => {
    vi.mocked(api.photos.getUntaggedSuggestion).mockRejectedValue(new Error('network error'));
    const onResolved = vi.fn();

    render(<ContributionSuggestionContainer baulId={baulId} onResolved={onResolved} />);

    await waitFor(() => expect(onResolved).toHaveBeenCalledTimes(1));
  });

  // Regression for a real crash: BaulRoute passes a brand new inline onResolved closure on
  // every one of its own renders (it re-renders whenever chapters/personas/baulRecuerdos
  // change, which happens repeatedly right after entering a baúl while useBaulScope's loads
  // are still settling). A previous version resolved the no-candidate case from a second
  // effect keyed on `[photo, onResolved]`, which re-fired on every such parent render and
  // threw React error #185 ("Maximum update depth exceeded"). This wrapper reproduces that
  // parent re-render churn to prove the fix doesn't depend on onResolved's identity.
  it('resolves exactly once even when the parent re-renders repeatedly with a new onResolved closure', async () => {
    vi.mocked(api.photos.getUntaggedSuggestion).mockResolvedValue(null);
    const onResolved = vi.fn();

    function ChurningParent() {
      const [tick, setTick] = useState(0);
      useEffect(() => {
        if (tick < 5) setTick((t) => t + 1);
      }, [tick]);
      return <ContributionSuggestionContainer baulId={baulId} onResolved={() => onResolved()} />;
    }

    render(<ChurningParent />);

    await waitFor(() => expect(onResolved).toHaveBeenCalledTimes(1));
  });

  it('shows the candidate photo and its persona selector, Guardar disabled with nothing selected', async () => {
    vi.mocked(api.photos.getUntaggedSuggestion).mockResolvedValue(photo());

    render(<ContributionSuggestionContainer baulId={baulId} onResolved={vi.fn()} />);

    expect(await screen.findByText('¿Nos ayudas con esta foto?')).toBeInTheDocument();
    expect(screen.getByText('Abuela')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
  });

  it('saves the selected personas and resolves on Guardar', async () => {
    const user = userEvent.setup();
    vi.mocked(api.photos.getUntaggedSuggestion).mockResolvedValue(photo());
    vi.mocked(setTaggedPersonas).mockResolvedValue(undefined);
    const onResolved = vi.fn();

    render(<ContributionSuggestionContainer baulId={baulId} onResolved={onResolved} />);
    await screen.findByText('Abuela');

    await user.click(screen.getByText('Abuela'));
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(setTaggedPersonas).toHaveBeenCalledWith('photo-1', ['p1']));
    expect(onResolved).toHaveBeenCalledTimes(1);
  });

  it('resolves on "Ahora no" without saving anything', async () => {
    const user = userEvent.setup();
    vi.mocked(api.photos.getUntaggedSuggestion).mockResolvedValue(photo());
    const onResolved = vi.fn();

    render(<ContributionSuggestionContainer baulId={baulId} onResolved={onResolved} />);
    await screen.findByText('¿Nos ayudas con esta foto?');

    await user.click(screen.getByText('Ahora no →'));

    expect(setTaggedPersonas).not.toHaveBeenCalled();
    expect(onResolved).toHaveBeenCalledTimes(1);
  });
});
