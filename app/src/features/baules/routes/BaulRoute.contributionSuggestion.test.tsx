// @vitest-environment jsdom
// Cubre la parte nueva de la condición de BaulRoute (ver comentario junto a
// canShowContributionSuggestion): primera sesión en la app y llegada por push/email deben
// suprimir el gate igual que el cooldown ya lo hacía — el resto de casos (candidata inexistente,
// guardado, "ahora no") ya están cubiertos por ContributionSuggestionContainer.test.tsx.
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Baul } from '@/types';
import { useBaulesStore } from '@/store/useBaulesStore';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { usePersonasStore } from '@/store/usePersonasStore';
import { useUIStore } from '@/store/uiStore';
import { BaulRoute } from './BaulRoute';

vi.mock('react-oidc-context', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub);
vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

vi.mock('@/features/baules/containers/WorkspaceSwitcherContainer', () => ({
  WorkspaceSwitcherContainer: () => null,
}));
vi.mock('@/features/baules/containers/BaulSettingsMenuContainer', () => ({
  BaulSettingsMenuContainer: () => null,
}));
vi.mock('@/features/baules/containers/ContributionSuggestionContainer', () => ({
  ContributionSuggestionContainer: () => <div>Sugerencia de contribución</div>,
}));
vi.mock('@/features/memories/containers/BaulFeedTabContainer', () => ({
  BaulFeedTabContainer: () => <div>Contenido de Recuerdos</div>,
}));
vi.mock('@/features/baules/containers/BaulChaptersTabContainer', () => ({
  BaulChaptersTabContainer: () => null,
}));
vi.mock('@/features/people/containers/BaulPersonasTabContainer', () => ({
  BaulPersonasTabContainer: () => null,
}));

const baul = { id: 'baul-1', name: 'Familia García', chapterCount: 0 } as Baul;

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/baules/:baulId" element={<BaulRoute />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('BaulRoute — cuándo se suprime la recomendación de contribución', () => {
  beforeEach(() => {
    useBaulesStore.setState({
      baules: [baul],
      chapters: { [baul.id]: [] },
      photos: {},
      loosePhotos: { [baul.id]: [] },
      isLoading: false,
    });
    useRecuerdosStore.setState({ baulRecuerdos: { [baul.id]: [] }, chapterRecuerdos: {} });
    usePersonasStore.setState({ personas: { [baul.id]: [] } });
    // Caso base: nada en cooldown y no es la primera sesión — así cada test solo aísla la
    // condición que le interesa (isFirstAppLaunch o entrySource) en vez de arrastrar el estado
    // que dejó el test anterior.
    useUIStore.setState({ isFirstAppLaunch: false });
  });

  it('se propone en una entrada normal (sin cooldown, sin ser la primera sesión)', async () => {
    renderAt(`/baules/${baul.id}`);

    expect(await screen.findByText('Sugerencia de contribución')).toBeInTheDocument();
  });

  it('se suprime en la primerísima sesión de la app', async () => {
    useUIStore.setState({ isFirstAppLaunch: true });

    renderAt(`/baules/${baul.id}`);

    expect(await screen.findByText('Contenido de Recuerdos')).toBeInTheDocument();
    expect(screen.queryByText('Sugerencia de contribución')).not.toBeInTheDocument();
  });

  it('se suprime al llegar desde una notificación push (?entry=push)', async () => {
    renderAt(`/baules/${baul.id}?entry=push`);

    expect(await screen.findByText('Contenido de Recuerdos')).toBeInTheDocument();
    expect(screen.queryByText('Sugerencia de contribución')).not.toBeInTheDocument();
  });

  it('se suprime al llegar desde un email (?entry=email)', async () => {
    renderAt(`/baules/${baul.id}?entry=email`);

    expect(await screen.findByText('Contenido de Recuerdos')).toBeInTheDocument();
    expect(screen.queryByText('Sugerencia de contribución')).not.toBeInTheDocument();
  });
});
