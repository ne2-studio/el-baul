import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { EmptyState } from '@/design-system/components/feedback/EmptyState';
import { SimpleFAB } from '@/design-system/components/actions/FAB';
import { Hero } from '@/design-system/layouts/Hero';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { PageHeader } from '@/design-system/layouts/PageHeader';
import { PhotoSwimlanes } from '@/features/photos/components/PhotoSwimlanes';
import { Tabbar } from '@/design-system/layouts/Tabbar';
import { Plus, ImageIcon, MessageCircle } from 'lucide-react';
import { ChapterRecuerdosFeedContainer } from '@/features/memories/containers/ChapterRecuerdosFeedContainer';
import { BatchPhotoActionsContainer } from '@/features/photos/containers/BatchPhotoActionsContainer';
import { ChapterSettingsMenuContainer } from '@/features/chapters/containers/ChapterSettingsMenuContainer';
import { Photo } from '@/types';
import { formatDateRange } from '@/app/utils/timeUtils';
import { useElementHeight } from '@/hooks/useElementHeight';
import { ErrorScreen } from '@/design-system/components/feedback/ErrorScreen';
import { useBaulesStore } from '@/store/useBaulesStore';
import { usePersonasStore } from '@/store/usePersonasStore';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { loadChapterRecuerdos } from '@/features/memories/useCases';
import { loadPersonas } from '@/features/people/useCases';
import { loadChapterPhotos } from '@/features/photos/useCases';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useBaulScope } from '@/hooks/useBaulScope';
import { resolvePhotoRouteContext } from '@/features/photos/uploadFlow';
import { openPhotoViewer, photoViewerPath } from '@/features/photos/viewerNavigation';

interface LocationState {
  // Set by UploadingRoute right after a successful upload — see its comment for why this
  // lives purely in router state instead of a store.
  recentlyUploadedPhotos?: Photo[];
}

// chapterId is present for a real chapter, absent for the virtual "Fotos sueltas" chapter
// (see useBaulesStore's nullable chapterId convention). Real-chapter photos are paginated
// per-chapter and fetched on demand via loadChapterPhotos; loose photos are already loaded
// in full by useBaulScope, so no separate fetch/loading state is needed for them. Chapter-only
// concerns (rename/delete, recuerdos) stay conditional on chapterId being present.
//
// ChapterRoute ensambla el chrome (PageHeader/Hero/Tabbar) directamente y compone las piezas
// autosuficientes de la pantalla — no hay un componente "shell" intermedio en components/,
// porque su único trabajo habría sido recomponer containers, lo cual ya no es presentacional
// de verdad aunque viva ahí. El grid de fotos y el estado de selección múltiple se quedan
// inline aquí (no en un container propio) porque los comparten el header, el Hero, el grid,
// la FAB y la barra de acciones en lote — ver la regla de containers/ en
// docs/architecture/frontend.md.
export const ChapterRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { recentlyUploadedPhotos } = (location.state as LocationState) || {};
  const { baulId, chapterId } = useParams();
  const auth = useAuth();
  const { photos } = useBaulesStore();
  // Solo para el badge de recuento del Tabbar y el modal de borrado — ChapterRecuerdosFeedContainer
  // lee los datos completos él mismo.
  const { chapterRecuerdos } = useRecuerdosStore();
  // La carga sigue aquí (guardia + efecto) porque BatchPhotoActionsContainer asume que ya
  // están cargadas al montar.
  const { personas } = usePersonasStore();
  const { run } = useAsyncAction();

  const { baul, chapters, loosePhotos, isLoading: isLoadingBaul, refreshFailed, retry } = useBaulScope(baulId);
  const chapter = chapterId ? chapters?.find(a => a.id === chapterId) : undefined;

  const [photosFailed, setPhotosFailed] = useState(false);
  const [activeTab, setActiveTab] = useState<'fotos' | 'recuerdos'>('fotos');
  const [headerRef, headerHeight] = useElementHeight<HTMLDivElement>();

  // Multi-selection state — compartido entre header, Hero, grid, FAB y la barra de acciones
  // en lote, así que no puede vivir dentro de un único tab container.
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  // Toggles an entire month-group at once (swimlane click): selects it fully unless
  // every photo in it is already selected, in which case it deselects the group.
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

  useEffect(() => {
    if (auth.isAuthenticated && baulId && chapterId) {
      loadChapterRecuerdos(baulId, chapterId);
    }
  }, [auth.isAuthenticated, baulId, chapterId]);

  const fetchChapterPhotos = async () => {
    if (!chapterId) return;
    const result = await run(() => loadChapterPhotos(chapterId), { errorMessage: 'Error al cargar las fotos' });
    setPhotosFailed(!result.ok);
  };

  useEffect(() => {
    if (auth.isAuthenticated && chapterId && !photos[chapterId]) {
      fetchChapterPhotos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated, chapterId, photos, loadChapterPhotos]);

  useEffect(() => {
    if (auth.isAuthenticated && baulId && !personas[baulId]) {
      // Distinct key — useAsyncAction.run() shares a default key across unkeyed calls, and
      // this effect can fire in the same flush as fetchChapterPhotos' unkeyed one above.
      run(() => loadPersonas(baulId), { key: 'personas', errorMessage: 'No se pudieron cargar las personas del baúl' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated, baulId, personas, loadPersonas]);

  if (isLoadingBaul) return <div className="p-8 text-center">Cargando...</div>;

  if (!baul) {
    if (refreshFailed) {
      return (
        <ErrorScreen
          title="No se ha podido cargar el baúl"
          message="Comprueba tu conexión e inténtalo de nuevo."
          actionLabel="Reintentar"
          onAction={retry}
        />
      );
    }
    return <div className="p-8 text-center">No se ha encontrado el baúl.</div>;
  }

  if (chapterId && !chapter) return <div className="p-8 text-center">No se ha encontrado el capítulo.</div>;

  if (chapterId && !photos[chapterId]) {
    if (photosFailed) {
      return (
        <ErrorScreen
          title="No se han podido cargar las fotos"
          message="Comprueba tu conexión e inténtalo de nuevo."
          actionLabel="Reintentar"
          onAction={fetchChapterPhotos}
        />
      );
    }
    return <div className="p-8 text-center">Cargando capítulo...</div>;
  }

  const currentPhotos = chapterId ? (photos[chapterId] || []) : (loosePhotos || []);
  const { currentChapter, basePath, apiChapterId } = resolvePhotoRouteContext({
    baulId: baul.id,
    chapterId,
    chapters: chapters || [],
    loosePhotos: currentPhotos,
  });
  if (!currentChapter) return <div className="p-8 text-center">No se ha encontrado el capítulo.</div>;

  const recuerdosCount = apiChapterId ? (chapterRecuerdos[apiChapterId] || []).length : 0;
  const totalRecuerdos = apiChapterId !== null
    ? recuerdosCount
    : currentPhotos.reduce((sum, photo) => sum + (photo.recuerdoCount || 0), 0);
  const moveableChapters = (chapters || []).filter(a => a.id !== currentChapter.id);

  const handleSelectPhoto = (photo: Photo) => openPhotoViewer(navigate, location, photoViewerPath(basePath, photo.id));
  const handleUploadPhotos = () => navigate(`${basePath}/confirmar`);

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        ref={headerRef}
        variant="row"
        onBack={selectionMode ? exitSelection : () => navigate(`/baules/${baul.id}`)}
        backLabel={selectionMode ? 'Cancelar' : 'Volver'}
        trailing={
          selectionMode ? (
            <span className="text-sm font-medium text-foreground">
              {selectedIds.size} {selectedIds.size === 1 ? 'seleccionada' : 'seleccionadas'}
            </span>
          ) : (
            <ChapterSettingsMenuContainer
              baulId={baul.id}
              chapterId={apiChapterId}
              chapterName={currentChapter.name}
              photoCount={currentPhotos.length}
              recuerdoCount={recuerdosCount}
              onEnterSelectionMode={() => setSelectionMode(true)}
            />
          )
        }
      />

      {/* Hero — shown when not in selection mode */}
      {!selectionMode && (
        <Hero imageUrl={currentChapter.featuredCoverPhotoUrl ?? currentChapter.coverPhotoUrl} title={currentChapter.name}>
          {currentChapter.minDate && currentChapter.maxDate && (
            <p className="text-xs text-white/65 mt-1 font-medium tracking-wide">
              {formatDateRange(currentChapter.minDate, currentChapter.maxDate)}
            </p>
          )}
        </Hero>
      )}

      {/* Tabbar solo para capítulos reales (no el de fotos sueltas virtual) — sin un
          chapterId no hay nada entre lo que hacer swipe. */}
      {apiChapterId !== null ? (
        <Tabbar
          tabs={[
            { key: 'fotos', label: 'Fotos', count: currentPhotos.length },
            { key: 'recuerdos', label: 'Recuerdos', count: recuerdosCount },
          ]}
          active={activeTab}
          onChange={(key) => setActiveTab(key as 'fotos' | 'recuerdos')}
          top={headerHeight}
          hideStrip={selectionMode}
        >
          <PageContainer className="py-6 pb-28">
            {activeTab === 'fotos' && (
              currentPhotos.length === 0 ? (
                <EmptyState
                  icon={<ImageIcon className="w-20 h-20" strokeWidth={1.5} />}
                  title="Todavía no hay fotos aquí"
                  subtitle="Añade fotos para empezar este recuerdo"
                />
              ) : (
                <PhotoSwimlanes
                  photos={currentPhotos}
                  recentlyAddedPhotos={recentlyUploadedPhotos}
                  onSelectPhoto={handleSelectPhoto}
                  selectionMode={selectionMode}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                  onLongPress={handleLongPress}
                  onToggleGroup={handleToggleGroup}
                />
              )
            )}

            <ChapterRecuerdosFeedContainer
              active={activeTab === 'recuerdos'}
              baulId={baul.id}
              baulName={baul.name}
              chapterId={apiChapterId}
              photos={currentPhotos}
              onSelectPhoto={handleSelectPhoto}
              selectionMode={selectionMode}
            />
          </PageContainer>
        </Tabbar>
      ) : (
        <PageContainer className="py-6 pb-28">
          {!selectionMode && totalRecuerdos > 0 && (
            <div className="flex items-center gap-1.5 mb-5 -mt-1">
              <MessageCircle className="w-3.5 h-3.5 text-muted-foreground/60" strokeWidth={1.5} />
              <span className="text-xs text-muted-foreground/75">
                {totalRecuerdos} {totalRecuerdos === 1 ? 'recuerdo' : 'recuerdos'} en este capítulo
              </span>
            </div>
          )}

          {currentPhotos.length === 0 ? (
            <EmptyState
              icon={<ImageIcon className="w-20 h-20" strokeWidth={1.5} />}
              title="Todavía no hay fotos aquí"
              subtitle="Añade fotos para empezar este recuerdo"
            />
          ) : (
            <PhotoSwimlanes
              photos={currentPhotos}
              recentlyAddedPhotos={recentlyUploadedPhotos}
              onSelectPhoto={handleSelectPhoto}
              selectionMode={selectionMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onLongPress={handleLongPress}
              onToggleGroup={handleToggleGroup}
            />
          )}
        </PageContainer>
      )}

      <SimpleFAB
        label="Subir fotos"
        icon={<Plus className="w-5 h-5" />}
        onClick={handleUploadPhotos}
        hidden={activeTab !== 'fotos' || selectionMode}
      />

      <BatchPhotoActionsContainer
        active={selectionMode}
        baulId={baul.id}
        chapterId={apiChapterId}
        photos={currentPhotos}
        selectedIds={selectedIds}
        moveableChapters={moveableChapters}
        onDone={exitSelection}
      />
    </div>
  );
};
