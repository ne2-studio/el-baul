// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Photo } from '@/types';
import { usePersonasStore } from '@/store/usePersonasStore';
import { PersonaFotosTabContainer } from './PersonaFotosTabContainer';

const personaId = 'p1';

function photo(overrides: Partial<Photo> = {}): Photo {
  return { id: 'photo-1', thumbnailUrl: '/thumb.jpg', fullUrl: '/full.jpg', recuerdoCount: 0, ...overrides } as Photo;
}

describe('PersonaFotosTabContainer', () => {
  beforeEach(() => {
    usePersonasStore.setState({ personas: {}, removalRequests: {}, personaPhotos: {}, taggedPersonas: {} });
  });

  it('renders the empty state when there are no photos', () => {
    usePersonasStore.setState({ personaPhotos: { [personaId]: [] } });

    render(<PersonaFotosTabContainer personaId={personaId} onSelectPhoto={() => {}} />);

    expect(screen.getByText('Todavía no hay fotos')).toBeInTheDocument();
  });

  it('renders the empty state when the photos are not cached yet', () => {
    render(<PersonaFotosTabContainer personaId={personaId} onSelectPhoto={() => {}} />);

    expect(screen.getByText('Todavía no hay fotos')).toBeInTheDocument();
  });

  it('renders the photos and calls onSelectPhoto on click', async () => {
    const user = userEvent.setup();
    const onSelectPhoto = vi.fn();
    usePersonasStore.setState({ personaPhotos: { [personaId]: [photo()] } });

    render(<PersonaFotosTabContainer personaId={personaId} onSelectPhoto={onSelectPhoto} />);
    await user.click(screen.getByAltText('Foto'));

    await waitFor(() => expect(onSelectPhoto).toHaveBeenCalledWith(expect.objectContaining({ id: 'photo-1' })));
  });
});
