// @vitest-environment jsdom
// Cubre el viaje de ida y vuelta Baúl <-> Capítulo, no solo BaulRoute: la pestaña de origen
// solo se puede comprobar completando el ciclo (entrar al capítulo, volver, mirar qué pestaña
// del baúl quedó activa), así que vive junto a BaulRoute pero monta ambas rutas reales.
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Baul, Chapter } from '@/types';
import { useBaulesStore } from '@/store/useBaulesStore';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { usePersonasStore } from '@/store/usePersonasStore';
import { BaulRoute } from './BaulRoute';
import { ChapterRoute } from '../../chapters/routes/ChapterRoute';

vi.mock('react-oidc-context', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

// jsdom no implementa ResizeObserver (usado por useElementHeight, vía PageHeader) ni un
// scroll real (Tabbar llama a window.scrollTo al cambiar de pestaña) — sin esto no rompen el
// test, pero sí ensucian la salida con warnings/errores no relacionados con lo que se prueba.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub);
vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

// Stubs de todo lo que no es el mecanismo de returnTab bajo prueba — cromo del header y
// las otras dos pestañas del baúl no aportan nada a este escenario, y montarlos de verdad
// solo añadiría dependencias de store/red irrelevantes.
vi.mock('@/features/baules/containers/WorkspaceSwitcherContainer', () => ({
  WorkspaceSwitcherContainer: () => null,
}));
vi.mock('@/features/baules/containers/BaulSettingsMenuContainer', () => ({
  BaulSettingsMenuContainer: () => null,
}));
vi.mock('@/features/people/containers/BaulPersonasTabContainer', () => ({
  BaulPersonasTabContainer: () => <div>Contenido de Personas</div>,
}));
vi.mock('@/features/memories/containers/BaulRecuerdosTabContainer', () => ({
  BaulRecuerdosTabContainer: ({ onOpenChapter }: { onOpenChapter?: (chapterId: string) => void }) => (
    <div>
      Contenido de Recuerdos
      <button onClick={() => onOpenChapter?.('chapter-1')}>Abrir capítulo desde recuerdos</button>
    </div>
  ),
}));
vi.mock('@/features/chapters/containers/ChapterSettingsMenuContainer', () => ({
  ChapterSettingsMenuContainer: () => null,
}));
vi.mock('@/features/photos/containers/BatchPhotoActionsContainer', () => ({
  BatchPhotoActionsContainer: () => null,
}));
vi.mock('@/features/memories/containers/ChapterRecuerdosFeedContainer', () => ({
  ChapterRecuerdosFeedContainer: ({ active }: { active: boolean }) => (active ? <div>Recuerdos del capítulo</div> : null),
}));

vi.mock('@/features/photos/useCases', () => ({
  loadChapterPhotos: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/features/memories/useCases', () => ({
  loadChapterRecuerdos: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/features/people/useCases', () => ({
  loadPersonas: vi.fn().mockResolvedValue(undefined),
}));

const baul = { id: 'baul-1', name: 'Familia García', chapterCount: 1 } as Baul;
const chapter = { id: 'chapter-1', name: 'Verano 2020', photoCount: 0, recuerdoCount: 0, undatedPhotoCount: 0 } as Chapter;

function renderApp(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/baules/:baulId" element={<BaulRoute />} />
        <Route path="/baules/:baulId/capitulos/:chapterId" element={<ChapterRoute />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Baúl <-> Capítulo: volver retoma la pestaña de origen', () => {
  beforeEach(() => {
    useBaulesStore.setState({
      baules: [baul],
      chapters: { [baul.id]: [chapter] },
      photos: { [chapter.id]: [] },
      loosePhotos: { [baul.id]: [] },
      isLoading: false,
    });
    useRecuerdosStore.setState({
      baulRecuerdos: { [baul.id]: [] },
      chapterRecuerdos: { [chapter.id]: [] },
    });
    usePersonasStore.setState({ personas: { [baul.id]: [] } });
  });

  it('vuelve a "capítulos" cuando el capítulo se abrió desde esa pestaña', async () => {
    const user = userEvent.setup();
    renderApp(`/baules/${baul.id}`);

    // getByText, no getByRole: el nombre accesible del botón concatena la etiqueta con el
    // badge de recuento ("Capítulos1"), pero son nodos de texto distintos.
    await user.click(screen.getByText('Capítulos'));
    await user.click(await screen.findByText(chapter.name));

    expect(await screen.findByText('Volver')).toBeInTheDocument();
    await user.click(screen.getByText('Volver'));

    // De vuelta en el baúl: la pestaña activa debe ser "Capítulos" (donde estaba antes de
    // entrar), no "Recuerdos" (la inicial por defecto).
    expect(await screen.findByText(chapter.name)).toBeInTheDocument();
    expect(screen.queryByText('Contenido de Recuerdos')).not.toBeInTheDocument();
  });

  it('vuelve a "recuerdos" cuando el capítulo se abrió desde esa pestaña', async () => {
    const user = userEvent.setup();
    renderApp(`/baules/${baul.id}`);

    // "recuerdos" ya es la pestaña inicial por defecto — no hace falta clicarla.
    await user.click(screen.getByText('Abrir capítulo desde recuerdos'));

    expect(await screen.findByText('Volver')).toBeInTheDocument();
    await user.click(screen.getByText('Volver'));

    expect(await screen.findByText('Contenido de Recuerdos')).toBeInTheDocument();
  });
});
