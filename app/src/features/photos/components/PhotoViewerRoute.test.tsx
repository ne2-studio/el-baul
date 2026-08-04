// @vitest-environment jsdom
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Baul, Photo } from '@/types';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { usePersonasStore } from '@/store/usePersonasStore';
import { PhotoViewerRoute } from './PhotoViewerRoute';

vi.mock('react-oidc-context', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

vi.mock('@/hooks/useBaulScope', () => ({
  useBaulScope: vi.fn(),
}));

vi.mock('@/features/memories/useCases', () => ({
  loadRecuerdos: vi.fn().mockResolvedValue(undefined),
  addRecuerdo: vi.fn().mockResolvedValue(undefined),
  editRecuerdo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/features/photos/useCases', () => ({
  loadTaggedPersonas: vi.fn().mockResolvedValue(undefined),
  setTaggedPersonas: vi.fn().mockResolvedValue(undefined),
  submitRemovalRequest: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/features/people/useCases', () => ({
  loadPersonas: vi.fn().mockResolvedValue(undefined),
}));

import { useBaulScope } from '@/hooks/useBaulScope';
import { loadRecuerdos } from '@/features/memories/useCases';
import { loadTaggedPersonas } from '@/features/photos/useCases';

const baul = { id: 'baul-1', name: 'Familia García', chapterCount: 0, role: 'custodio' } as Baul;
const photo: Photo = { id: 'photo-1', thumbnailUrl: '/thumb.jpg', fullUrl: '/full.jpg', recuerdoCount: 0 };

function renderRoute() {
  return render(
    <MemoryRouter initialEntries={['/baules/baul-1/fotos-sueltas/foto/photo-1']}>
      <Routes>
        <Route path="/baules/:baulId/fotos-sueltas/foto/:photoId" element={<PhotoViewerRoute />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('PhotoViewerRoute concurrent effects', () => {
  beforeEach(() => {
    vi.mocked(useBaulScope).mockReturnValue({
      baul,
      chapters: [],
      loosePhotos: [photo],
      isLoading: false,
      refreshFailed: false,
      retry: vi.fn(),
    } as unknown as ReturnType<typeof useBaulScope>);

    usePersonasStore.setState({ personas: { 'baul-1': [] }, taggedPersonas: {} });
    useRecuerdosStore.setState({ recuerdos: {} });
    vi.mocked(loadRecuerdos).mockClear().mockResolvedValue(undefined);
    vi.mocked(loadTaggedPersonas).mockClear().mockResolvedValue(undefined);
  });

  it('loads both recuerdos and tagged personas for the open photo in the same mount', async () => {
    renderRoute();

    // Both come from the same effect via useAsyncAction.run() with distinct keys
    // ('recuerdos' / 'tagged-personas') — without them, the second unkeyed call would
    // silently no-op as "already-pending" instead of running (see PhotoViewerRoute.tsx).
    await waitFor(() => expect(loadRecuerdos).toHaveBeenCalledWith('photo-1'));
    expect(loadTaggedPersonas).toHaveBeenCalledWith('photo-1');
  });
});
