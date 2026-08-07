// @vitest-environment jsdom
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
