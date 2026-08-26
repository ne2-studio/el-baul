// @vitest-environment jsdom
// Cubre la condición de BaulRoute (ver comentario junto a canShowContributionSuggestion) que
// decide *cuándo* preguntarle al backend por una sugerencia: cooldown, primera sesión en la app y
// llegada por push/email deben suprimir el gate. Qué tipo de sugerencia proponer (o ninguna) ya
// no lo decide el front — eso lo cubre ContributionsManagerTests en el backend; aquí solo se
// verifica que se monta o no ContributionSuggestionGateContainer.
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
vi.mock('@/features/contributions/containers/ContributionSuggestionGateContainer', () => ({
  ContributionSuggestionGateContainer: () => <div>Sugerencia de contribución</div>,
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

function renderAt(path: string, state?: unknown) {
  // Entry-object en vez de un string plano: solo así MemoryRouter le puede adjuntar el
  // state (location.state) que consume canShowContributionSuggestion — pero pathname/search
  // hay que separarlos a mano, si no la query string entera se cuela en el pathname.
  const [pathname, search] = path.split('?');
  const entry = state !== undefined ? { pathname, search: search ? `?${search}` : '', state } : path;
  return render(
    <MemoryRouter initialEntries={[entry]}>
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

  it('se suprime al volver a "recuerdos" desde otra pantalla (p.ej. "Volver" tras subir fotos)', async () => {
    // PhotoBatchGridRoute, sin un returnTo propio, navega de vuelta con state.activeTab:
    // 'recuerdos' explícito — indistinguible de initialTab por defecto si no se comprobara
    // cameBackFromChildRoute (ver el comentario junto a canShowContributionSuggestion).
    renderAt(`/baules/${baul.id}`, { activeTab: 'recuerdos' });

    expect(await screen.findByText('Contenido de Recuerdos')).toBeInTheDocument();
    expect(screen.queryByText('Sugerencia de contribución')).not.toBeInTheDocument();
  });
});
