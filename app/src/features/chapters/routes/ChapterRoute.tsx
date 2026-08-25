import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { EmptyState } from '@/design-system/components/feedback/EmptyState';
import { SimpleFAB } from '@/design-system/components/actions/FAB';
import { Hero } from '@/design-system/layouts/Hero';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { PageHeader } from '@/design-system/layouts/PageHeader';
import { PhotoSwimlanes } from '@/features/photos/components/PhotoSwimlanes';
import { Tabbar } from '@/design-system/layouts/Tabbar';
import { Plus, ImageIcon } from 'lucide-react';
import { ChapterRecuerdosFeedContainer } from '@/features/memories/containers/ChapterRecuerdosFeedContainer';
import { BatchPhotoActionsContainer } from '@/features/photos/containers/BatchPhotoActionsContainer';
import { ChapterSettingsMenuContainer } from '@/features/chapters/containers/ChapterSettingsMenuContainer';
import { Photo } from '@/types';
import { formatDateRange } from '@/app/utils/timeUtils';
import { useElementHeight } from '@/hooks/useElementHeight';
import { ErrorScreen } from '@/design-system/components/feedback/ErrorScreen';
import { FullScreenLoading } from '@/design-system/components/feedback/FullScreenLoading';
import { useBaulesStore } from '@/store/useBaulesStore';
import { hydratePhotos, usePhotosStore } from '@/store/usePhotosStore';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { useBaulScope } from '@/hooks/useBaulScope';
import { guardBaulScope } from '@/hooks/baulScopeGuard';
import { useChapterScope } from '@/hooks/useChapterScope';
import { resolvePhotoRouteContext } from '@/features/photos/uploadFlow';
import { openPhotoViewer, photoViewerPath } from '@/features/photos/viewerNavigation';

interface LocationState {
  // Set by BaulRoute.handleSelectChapter (the "capítulos"/"recuerdos" tabs, the only two that
  // link here) so "Volver" can reopen the same tab instead of always falling back to the
  // baúl's initial one — same returnTab mechanism PersonaDetailRoute already uses. Defaults to
  // 'capitulos' for entry points that don't set it (e.g. a deep link).
  returnTab?: 'recuerdos' | 'capitulos';
}

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
  const { returnTab = 'capitulos' } = (location.state as LocationState) || {};
  const { baulId, chapterId } = useParams();
  const { photos } = useBaulesStore();
  const photosById = usePhotosStore((state) => state.photosById);
  // Solo para el badge de recuento del Tabbar y el modal de borrado — ChapterRecuerdosFeedContainer
  // lee los datos completos él mismo.
  const { chapterRecuerdos } = useRecuerdosStore();

  const baulScope = useBaulScope(baulId);
  const { chapters } = baulScope;
  const chapter = chapterId ? chapters?.find(a => a.id === chapterId) : undefined;
  const chapterScope = useChapterScope(baulId, chapterId);

  const [activeTab, setActiveTab] = useState<'recuerdos' | 'fotos'>('recuerdos');
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

  const guard = guardBaulScope(baulScope);
  if (!guard.ready) return guard.screen;
  const { baul } = guard;

  if (!chapter) return <div className="p-8 text-center">No se ha encontrado el capítulo.</div>;

  if (chapterScope.isLoading) return <FullScreenLoading message="Abriendo capítulo..." />;
  if (!chapterScope.photos || !chapterScope.chapterRecuerdos) {
    if (chapterScope.loadFailed) {
      return (
        <ErrorScreen
          title="No se ha podido cargar el capítulo"
          message="Comprueba tu conexión e inténtalo de nuevo."
          actionLabel="Reintentar"
          onAction={chapterScope.retry}
        />
      );
    }
    return <FullScreenLoading message="Abriendo capítulo..." />;
  }

  const currentPhotos = hydratePhotos(photos[chapterId!], photosById) || [];
  const { currentChapter, basePath, apiChapterId } = resolvePhotoRouteContext({
    baulId: baul.id,
    chapterId,
    chapters: chapters || [],
    loosePhotos: [],
  });
  if (!currentChapter || !apiChapterId) return <div className="p-8 text-center">No se ha encontrado el capítulo.</div>;

  const recuerdosCount = (chapterRecuerdos[apiChapterId] || []).length;
  const moveableChapters = (chapters || []).filter(a => a.id !== currentChapter.id);

  const handleSelectPhoto = (photo: Photo) => openPhotoViewer(navigate, location, photoViewerPath(basePath, photo.id));
  const handleUploadPhotos = () => navigate(`${basePath}/confirmar`, {
    state: { returnTo: { pathname: `/baules/${baul.id}/capitulos/${apiChapterId}`, state: { activeTab: 'fotos' } } },
  });

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        ref={headerRef}
        variant="row"
        onBack={selectionMode ? exitSelection : () => navigate(`/baules/${baul.id}`, { state: { activeTab: returnTab } })}
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

      <Tabbar
        tabs={[
          { key: 'recuerdos', label: 'Recuerdos' },
          { key: 'fotos', label: 'Fotos' },
        ]}
        active={activeTab}
        onChange={(key) => setActiveTab(key as 'recuerdos' | 'fotos')}
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
