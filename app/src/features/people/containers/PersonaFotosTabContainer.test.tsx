// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Photo } from '@/types';
import { usePersonasStore } from '@/store/usePersonasStore';
import { PersonaFotosTabContainer } from './PersonaFotosTabContainer';

vi.mock('react-oidc-context', () => ({
  useAuth: vi.fn(() => ({ isAuthenticated: true })),
}));

vi.mock('@/features/people/useCases', () => ({
  loadPersonaPhotos: vi.fn(),
}));

import { loadPersonaPhotos } from '@/features/people/useCases';

const baulId = 'baul-1';
const personaId = 'p1';

function photo(overrides: Partial<Photo> = {}): Photo {
  return { id: 'photo-1', thumbnailUrl: '/thumb.jpg', fullUrl: '/full.jpg', recuerdoCount: 0, ...overrides } as Photo;
}

describe('PersonaFotosTabContainer', () => {
  beforeEach(() => {
    usePersonasStore.setState({ personas: {}, removalRequests: {}, personaPhotos: {}, taggedPersonas: {} });
    vi.clearAllMocks();
  });

  it('loads the photos when not cached yet', () => {
    vi.mocked(loadPersonaPhotos).mockResolvedValue(undefined);

    render(<PersonaFotosTabContainer baulId={baulId} personaId={personaId} onSelectPhoto={vi.fn()} />);

    expect(loadPersonaPhotos).toHaveBeenCalledWith(baulId, personaId);
  });

  it('does not reload when already cached', () => {
    usePersonasStore.setState({ personaPhotos: { [personaId]: [photo()] } });

    render(<PersonaFotosTabContainer baulId={baulId} personaId={personaId} onSelectPhoto={vi.fn()} />);

    expect(loadPersonaPhotos).not.toHaveBeenCalled();
  });

  it('renders the empty state when there are no photos', () => {
    usePersonasStore.setState({ personaPhotos: { [personaId]: [] } });

    render(<PersonaFotosTabContainer baulId={baulId} personaId={personaId} onSelectPhoto={vi.fn()} />);

    expect(screen.getByText('Todavía no hay fotos')).toBeInTheDocument();
  });

  it('renders the photos and calls onSelectPhoto on click', async () => {
    const user = userEvent.setup();
    const onSelectPhoto = vi.fn();
    usePersonasStore.setState({ personaPhotos: { [personaId]: [photo()] } });

    render(<PersonaFotosTabContainer baulId={baulId} personaId={personaId} onSelectPhoto={onSelectPhoto} />);
    await user.click(screen.getByAltText('Foto'));

    await waitFor(() => expect(onSelectPhoto).toHaveBeenCalledWith(expect.objectContaining({ id: 'photo-1' })));
  });
});
