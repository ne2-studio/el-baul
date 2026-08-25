import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { BackButton } from '@/design-system/components/navigation/BackButton';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { PageHeader } from '@/design-system/layouts/PageHeader';
import { Tabbar } from '@/design-system/layouts/Tabbar';
import { useElementHeight } from '@/hooks/useElementHeight';
import { BaulChaptersTabContainer } from '@/features/baules/containers/BaulChaptersTabContainer';
import { ContributionSuggestionGateContainer } from '@/features/contributions/containers/ContributionSuggestionGateContainer';
import { BaulPersonasTabContainer } from '@/features/people/containers/BaulPersonasTabContainer';
import { BaulFeedTabContainer } from '@/features/memories/containers/BaulFeedTabContainer';
import { BaulPhotosTabContainer } from '@/features/photos/containers/BaulPhotosTabContainer';
import { BatchPhotoActionsContainer } from '@/features/photos/containers/BatchPhotoActionsContainer';
import { BaulSettingsMenuContainer } from '@/features/baules/containers/BaulSettingsMenuContainer';
import { WorkspaceSwitcherContainer } from '@/features/baules/containers/WorkspaceSwitcherContainer';
import { Photo } from '@/types';
import { useBaulesStore } from '@/store/useBaulesStore';
import { hydratePhotos, usePhotosStore } from '@/store/usePhotosStore';
import { useUIStore } from '@/store/uiStore';
import { getEntrySource } from '@/utils/entrySource';
import { useBaulScope } from '@/hooks/useBaulScope';
import { guardBaulScope } from '@/hooks/baulScopeGuard';
import { getBaulPermissions } from '@/utils/roleUtils';
import { openPhotoViewer, photoViewerPath } from '@/features/photos/viewerNavigation';
import { readBaulScrollPosition, saveBaulScrollPosition } from './baulScrollRestoration';

type BaulTab = 'capitulos' | 'personas' | 'recuerdos' | 'fotos';

// BaulRoute ensambla el chrome (PageHeader/Tabbar) directamente y compone las pestañas como
// containers autosuficientes — no hay un componente "shell" intermedio en components/, porque
// su único trabajo habría sido recomponer containers, lo cual ya no es presentacional de
// verdad aunque viva ahí — ver la regla de containers/ en docs/architecture/frontend.md.
// A diferencia de Capítulo/Persona, no lleva Hero: el selector de workspace en el PageHeader
// ya hace de "título" de la pantalla — ver docs/DESIGN.md, "Content screen composition".
//
// La pestaña "Fotos" (todas las fotos del baúl, todos los capítulos + sueltas) es la única
// con selección múltiple — ese estado (selectionMode/selectedIds) necesita el header
// compartido (icono de ajustes vs. contador de selección) y la barra de acciones en lote, así
// que se queda inline aquí en vez de en BaulPhotosTabContainer — mismo motivo que
// ChapterRoute mantiene su propio selectionMode inline en vez de en un container.
export const BaulRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { baulId } = useParams();
  const auth = useAuth();

  const baulPhotosIds = useBaulesStore((state) => state.baulPhotos);
  const loosePhotosIds = useBaulesStore((state) => state.loosePhotos);
  const photosById = usePhotosStore((state) => state.photosById);

  const startContributionSuggestionCooldown = useUIStore((state) => state.startContributionSuggestionCooldown);

  const [headerRef, headerHeight] = useElementHeight<HTMLDivElement>();
  const initialTab = (location.state as { activeTab?: BaulTab } | null)?.activeTab ?? 'recuerdos';
  const [activeTab, setActiveTab] = useState<BaulTab>(initialTab);

  // Selección múltiple de la pestaña "Fotos" — ver el comentario de cabecera. Se resetea al
  // cambiar de pestaña (más abajo) para que no quede "colgada" si la persona vuelve más tarde.
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Filtro activo de BaulPhotosTabContainer ('sin-capitulo' | 'todas'), notificado vía
  // onFilterChange — determina si la barra de acciones en lote ofrece Mover/Crear capítulo
  // (ver su montaje más abajo).
  const [photosFilter, setPhotosFilter] = useState<'sin-capitulo' | 'todas'>('sin-capitulo');

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      setSelectionMode(next.size > 0);
      return next;
    });
  };

  const handleLongPress = (photoId: string) => {
    setSelectionMode(true);
    setSelectedIds(new Set([photoId]));
  };

  // Selecciona/deselecciona un swimlane entero de golpe — mismo comportamiento que
  // ChapterRoute.handleToggleGroup.
  const handleToggleGroup = (groupPhotos: Photo[]) => {
    const groupIds = groupPhotos.map(p => p.id);
    const allSelected = groupIds.length > 0 && groupIds.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      groupIds.forEach(id => allSelected ? next.delete(id) : next.add(id));
      setSelectionMode(next.size > 0);
      return next;
    });
  };

  const exitSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleChangeTab = (key: string) => {
    exitSelection();
    setActiveTab(key as BaulTab);
  };
  // Solo hay algo que restaurar cuando se llega con un activeTab explícito en el state — eso
  // solo pasa al volver de un Capítulo o de una Persona (ver returnTab en handleSelectChapter
  // y en el "Volver" de ChapterRoute/PersonaDetailRoute), nunca en una entrada nueva al baúl.
  const cameBackFromChildRoute = Boolean((location.state as { activeTab?: BaulTab } | null)?.activeTab);
  // Solo se intenta cuando el punto de entrada es el feed ('recuerdos', el valor por defecto
  // de initialTab — cualquier otra pestaña llega por un state.activeTab explícito, es decir
  // por navegación directa, no por una entrada nueva al baúl), el baúl no está en cooldown
  // (ver uiStore: por baulId, persistido en localStorage, duración configurable vía appsettings
  // — ver useAppConfigStore.contributionSuggestionCooldownMinutes), no es la
  // primerísima sesión en la app (isFirstAppLaunch: la persona aún no ha visto cómo funciona
  // el resto de la app) y la navegación no viene de una notificación push ni de un email (ver
  // utils/entrySource): en ambos casos la persona llega con una intención propia (ver una
  // foto o capítulo concreto) y no toca interrumpirla con esto.
  // Qué tipo de sugerencia ofrecer (etiquetar personas, escribir un recuerdo) y con qué foto —
  // o si hay alguna en absoluto — lo decide el backend (dominio Contributions, ver
  // ContributionSuggestionGateContainer); aquí solo se decide *cuándo* preguntarle, que es
  // estado de navegación/dispositivo: solo se intenta cuando el punto de entrada es el feed
  // ('recuerdos', el valor por defecto de initialTab — cualquier otra pestaña llega por un
  // state.activeTab explícito, es decir por navegación directa, no por una entrada nueva al
  // baúl), el baúl no está en cooldown (ver uiStore: por baulId, persistido en localStorage,
  // duración configurable vía appsettings — ver useAppConfigStore.contributionSuggestionCooldownMinutes),
  // no es la primerísima sesión en la app (isFirstAppLaunch: la persona aún no ha visto cómo
  // funciona el resto de la app) y la navegación no viene de una notificación push ni de un
  // email (ver utils/entrySource): en ambos casos la persona llega con una intención propia (ver
  // una foto o capítulo concreto) y no toca interrumpirla con esto.
  const canShowContributionSuggestion = () =>
    initialTab === 'recuerdos' &&
    !useUIStore.getState().isContributionSuggestionOnCooldown(baulId ?? '') &&
    !useUIStore.getState().isFirstAppLaunch &&
    !getEntrySource(location.search);
  const [offerContribution, setOfferContribution] = useState<boolean>(
    () => (baulId ? canShowContributionSuggestion() : false)
  );

  // El selector de workspace navega a `/baules/${otroBaulId}` reutilizando esta misma instancia
  // de BaulRoute (misma ruta, solo cambia el parámetro) en vez de desmontarla — así que el
  // useState de arriba, que solo corre al montar, no vuelve a evaluarse al cambiar de baúl. El
  // cooldown es por baulId, así que cambiar de baúl debe poder proponer una sugerencia nueva
  // aunque el baúl anterior siga en cooldown.
  useEffect(() => {
    if (!baulId) return;
    setOfferContribution(canShowContributionSuggestion());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baulId]);

  const baulScope = useBaulScope(baulId, { includeBaulFeed: activeTab === 'recuerdos' });
  const guard = guardBaulScope(baulScope, { loadingLabel: 'Abriendo baúl...' });

  // Restaura el scroll de la pestaña de origen al volver de un Capítulo/Persona. Se dispara
  // cuando el guard pasa a listo (antes de eso no hay nada pintado a lo que hacer scroll) — el
  // rAF deja que ScrollToTop (montado antes que <Routes> en App.tsx, así que su efecto de
  // reset a (0,0) corre primero en el mismo commit) y el layout del tab ya pintado terminen
  // antes de saltar a la posición guardada.
  useEffect(() => {
    if (!guard.ready || !cameBackFromChildRoute) return;
    const savedScrollY = readBaulScrollPosition(guard.baul.id, activeTab);
    if (savedScrollY === undefined) return;
    requestAnimationFrame(() => window.scrollTo(0, savedScrollY));
    // activeTab/cameBackFromChildRoute no cambian entre el mount y que guard.ready pase a
    // true — solo se necesita disparar una vez, al quedar listo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guard.ready]);

  if (!guard.ready) return guard.screen;
  const { baul } = guard;

  const baulPermissions = getBaulPermissions(baul);
  // Solo para la barra de acciones en lote de la pestaña "Fotos" — BaulPhotosTabContainer lee
  // estas mismas store slices él mismo para pintar el grid, ver ese archivo.
  const baulPhotosList = hydratePhotos(baulPhotosIds[baul.id], photosById) || [];
  const loosePhotosList = hydratePhotos(loosePhotosIds[baul.id], photosById) || [];

  const resolveContributionSuggestion = () => {
    startContributionSuggestionCooldown(baul.id);
    setOfferContribution(false);
  };

  if (offerContribution) {
    return <ContributionSuggestionGateContainer baulId={baul.id} onResolved={resolveContributionSuggestion} />;
  }

  const handleSelectChapter = (chapter: { id: string }) => {
    if (!auth.isAuthenticated) return;
    // Las fotos y los recuerdos del capítulo se cargan ya dentro de ChapterRoute (vía
    // useChapterScope, que bloquea hasta tener ambos) — prefetchearlas aquí antes de navegar
    // solo servía para pintar un segundo loader propio ("Cargando fotos...") justo antes del
    // "Abriendo capítulo..." de ChapterRoute, dos loaders consecutivos para una única
    // transición. Navegar directo deja el gate en un único sitio.
    // returnTab: para que el botón "Volver" de ChapterRoute pueda reabrir la pestaña desde la
    // que se entró (recuerdos o capítulos, las dos únicas que llevan aquí) en vez de caer
    // siempre en la pestaña inicial — mismo mecanismo que ya usan handleSelectPersona en
    // BaulPersonasTabContainer/BaulFeedTabContainer con PersonaDetailRoute.
    // Se guarda el scroll de la pestaña actual para poder devolver a la misma posición al
    // volver (ver el useEffect de arriba que lo lee).
    saveBaulScrollPosition(baul.id, activeTab);
    navigate(`/baules/${baul.id}/capitulos/${chapter.id}`, { state: { returnTab: activeTab } });
  };

  const handleSelectPhoto = (photo: Photo) =>
    openPhotoViewer(navigate, location, photoViewerPath(`/baules/${baul.id}/fotos`, photo.id));

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        ref={headerRef}
        variant="row"
        leading={
          activeTab === 'fotos' && selectionMode
            ? <BackButton onClick={exitSelection} label="Cancelar" />
            : <WorkspaceSwitcherContainer activeBaul={baul} />
        }
        trailing={
          activeTab === 'fotos' && selectionMode ? (
            <span className="text-sm font-medium text-foreground">
              {selectedIds.size} {selectedIds.size === 1 ? 'seleccionada' : 'seleccionadas'}
            </span>
          ) : (
            <div className="flex items-center gap-1">
              <BaulSettingsMenuContainer baul={baul} />
            </div>
          )
        }
      />

      {/* top es la altura medida del header, no un valor fijo — iOS/WKWebView y
          Android/Chrome WebView renderizan el mismo header a alturas ligeramente distintas. */}
      <Tabbar
        tabs={[
          {
            key: 'recuerdos',
            // "Historia" solo aquí, en la Tabbar del baúl — el resto de la app (capítulo,
            // ficha de persona) sigue llamando "Recuerdos" a su propia pestaña de recuerdos;
            // el key interno tampoco cambia (routing/returnTab siguen usando 'recuerdos').
            // Sin badge de recuento — un número aquí no comunica nada útil; el feed ya
            // distingue lo nuevo con su propia swimlane (ver FeedTab).
            label: 'Historia',
          },
          { key: 'fotos', label: 'Fotos' },
          { key: 'capitulos', label: 'Capítulos' },
          // "Familia" solo aquí, en la Tabbar del baúl — mismo motivo que "Historia" arriba.
          { key: 'personas', label: 'Familia' },
        ]}
        active={activeTab}
        onChange={handleChangeTab}
        top={headerHeight}
        hideStrip={activeTab === 'fotos' && selectionMode}
      >
        <PageContainer className="py-6 pb-28">
          {activeTab === 'recuerdos' && (
            <BaulFeedTabContainer
              baulId={baul.id}
              baulName={baul.name}
              onOpenChapter={(chapterId) => handleSelectChapter({ id: chapterId })}
            />
          )}

          {activeTab === 'fotos' && (
            <BaulPhotosTabContainer
              baulId={baul.id}
              selectionMode={selectionMode}
              selectedIds={selectedIds}
              onSelectPhoto={handleSelectPhoto}
              onToggleSelect={toggleSelect}
              onLongPress={handleLongPress}
              onToggleGroup={handleToggleGroup}
              onFilterChange={setPhotosFilter}
            />
          )}

          {activeTab === 'capitulos' && (
            <BaulChaptersTabContainer baulId={baul.id} onSelectChapter={handleSelectChapter} />
          )}

          {activeTab === 'personas' && (
            <BaulPersonasTabContainer baulId={baul.id} canCreatePersona={baulPermissions.canCreatePersona} />
          )}
        </PageContainer>
      </Tabbar>

      {/* "Mover"/"Crear capítulo" solo tienen sentido con el filtro "Sin capítulo": con "Todas"
          la selección puede abarcar varios capítulos a la vez, así que no hay un único origen
          desde el que mover, ni un conjunto coherente que mover a un capítulo nuevo — ver el
          comentario de allowMoveActions en BatchPhotoActionsContainer. */}
      <BatchPhotoActionsContainer
        active={activeTab === 'fotos' && selectionMode}
        baulId={baul.id}
        chapterId={null}
        photos={photosFilter === 'sin-capitulo' ? loosePhotosList : baulPhotosList}
        selectedIds={selectedIds}
        moveableChapters={photosFilter === 'sin-capitulo' ? (baulScope.chapters || []) : []}
        allowMoveActions={photosFilter === 'sin-capitulo'}
        onDone={exitSelection}
      />
    </div>
  );
};
