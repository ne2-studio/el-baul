import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { UserCircle } from 'lucide-react';
import { BlockingLoadingOverlay } from '@/design-system/components/feedback/BlockingLoadingOverlay';
import { IconButton } from '@/design-system/components/actions/IconButton';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { PageHeader } from '@/design-system/layouts/PageHeader';
import { Tabbar } from '@/design-system/layouts/Tabbar';
import { useElementHeight } from '@/hooks/useElementHeight';
import { BaulChaptersTabContainer } from '@/features/baules/containers/BaulChaptersTabContainer';
import { ContributionSuggestionContainer } from '@/features/baules/containers/ContributionSuggestionContainer';
import { BaulPersonasTabContainer } from '@/features/people/containers/BaulPersonasTabContainer';
import { BaulFeedTabContainer } from '@/features/memories/containers/BaulFeedTabContainer';
import { BaulSettingsMenuContainer } from '@/features/baules/containers/BaulSettingsMenuContainer';
import { WorkspaceSwitcherContainer } from '@/features/baules/containers/WorkspaceSwitcherContainer';
import { useBaulesStore } from '@/store/useBaulesStore';
import { usePersonasStore } from '@/store/usePersonasStore';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { useUIStore } from '@/store/uiStore';
import { loadChapterPhotos } from '@/features/photos/useCases';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useBaulScope } from '@/hooks/useBaulScope';
import { guardBaulScope } from '@/hooks/baulScopeGuard';
import { getBaulPermissions } from '@/utils/roleUtils';

type BaulTab = 'capitulos' | 'personas' | 'recuerdos';

// BaulRoute ensambla el chrome (PageHeader/Tabbar) directamente y compone las 3 pestañas como
// containers autosuficientes — no hay un componente "shell" intermedio en components/, porque
// su único trabajo habría sido recomponer containers, lo cual ya no es presentacional de
// verdad aunque viva ahí — ver la regla de containers/ en docs/architecture/frontend.md.
// A diferencia de Capítulo/Persona, no lleva Hero: el selector de workspace en el PageHeader
// ya hace de "título" de la pantalla — ver docs/DESIGN.md, "Content screen composition".
export const BaulRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { baulId } = useParams();
  const auth = useAuth();
  const { run } = useAsyncAction();

  // Solo para los badges de recuento del Tabbar — cada tab container lee sus propios datos
  // completos del store.
  const { chapters } = useBaulesStore();
  const { personas } = usePersonasStore();
  const { baulRecuerdos, baulFeed } = useRecuerdosStore();
  const baulFeedEnabled = useAppConfigStore((state) => state.baulFeedEnabled);
  const setShowProfileMenu = useUIStore((state) => state.setShowProfileMenu);
  const startContributionSuggestionCooldown = useUIStore((state) => state.startContributionSuggestionCooldown);

  const [isLoadingChapterPhotos, setIsLoadingChapterPhotos] = useState(false);
  const [headerRef, headerHeight] = useElementHeight<HTMLDivElement>();
  const initialTab = (location.state as { activeTab?: BaulTab } | null)?.activeTab ?? 'recuerdos';
  const [activeTab, setActiveTab] = useState<BaulTab>(initialTab);
  // Solo se intenta cuando el punto de entrada es el feed ('recuerdos', el valor por defecto
  // de initialTab — cualquier otra pestaña llega por un state.activeTab explícito, es decir
  // por navegación directa, no por una entrada nueva al baúl) y el baúl no está en cooldown
  // (ver uiStore: por baulId, 60 minutos fijos, persistido en localStorage).
  const [showContributionSuggestion, setShowContributionSuggestion] = useState(
    () => initialTab === 'recuerdos' && !!baulId && !useUIStore.getState().isContributionSuggestionOnCooldown(baulId)
  );

  // El selector de workspace navega a `/baules/${otroBaulId}` reutilizando esta misma instancia
  // de BaulRoute (misma ruta, solo cambia el parámetro) en vez de desmontarla — así que el
  // useState de arriba, que solo corre al montar, no vuelve a evaluarse al cambiar de baúl. El
  // cooldown es por baulId, así que cambiar de baúl debe poder proponer una sugerencia nueva
  // aunque el baúl anterior siga en cooldown.
  useEffect(() => {
    if (!baulId) return;
    setShowContributionSuggestion(initialTab === 'recuerdos' && !useUIStore.getState().isContributionSuggestionOnCooldown(baulId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baulId]);

  const baulScope = useBaulScope(baulId);
  const guard = guardBaulScope(baulScope, { loadingLabel: 'Abriendo baúl...' });
  if (!guard.ready) return guard.screen;
  const { baul } = guard;

  const baulPermissions = getBaulPermissions(baul);

  if (showContributionSuggestion) {
    return (
      <ContributionSuggestionContainer
        baulId={baul.id}
        onResolved={() => {
          startContributionSuggestionCooldown(baul.id);
          setShowContributionSuggestion(false);
        }}
      />
    );
  }

  const handleSelectChapter = async (chapter: { id: string }) => {
    if (!auth.isAuthenticated) return;
    setIsLoadingChapterPhotos(true);
    const result = await run(() => loadChapterPhotos(chapter.id), { errorMessage: 'Error al cargar las fotos' });
    setIsLoadingChapterPhotos(false);
    // returnTab: para que el botón "Volver" de ChapterRoute pueda reabrir la pestaña desde la
    // que se entró (recuerdos o capítulos, las dos únicas que llevan aquí) en vez de caer
    // siempre en la pestaña inicial — mismo mecanismo que ya usan handleSelectPersona en
    // BaulPersonasTabContainer/BaulFeedTabContainer con PersonaDetailRoute.
    if (result.ok) navigate(`/baules/${baul.id}/capitulos/${chapter.id}`, { state: { returnTab: activeTab } });
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        ref={headerRef}
        variant="row"
        leading={<WorkspaceSwitcherContainer activeBaul={baul} />}
        trailing={
          <div className="flex items-center gap-1">
            <IconButton aria-label="Abrir menú de cuenta" onClick={() => setShowProfileMenu(true)}>
              <UserCircle className="w-5 h-5" />
            </IconButton>
            <BaulSettingsMenuContainer baul={baul} />
          </div>
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
            label: 'Historia',
            // Con el toggle activo, cuenta el feed mezclado en cuanto carga; hasta entonces
            // (y siempre con el toggle apagado) cae en baulRecuerdos, ya precargado por
            // useBaulScope — así el badge nunca parpadea a 0 mientras el feed nuevo llega.
            count: (baulFeedEnabled ? baulFeed[baul.id] : undefined)?.length ?? (baulRecuerdos[baul.id] || []).length,
          },
          { key: 'capitulos', label: 'Capítulos', count: (chapters[baul.id] || []).length },
          // "Familia" solo aquí, en la Tabbar del baúl — mismo motivo que "Historia" arriba.
          { key: 'personas', label: 'Familia', count: (personas[baul.id] || []).length },
        ]}
        active={activeTab}
        onChange={(key) => setActiveTab(key as BaulTab)}
        top={headerHeight}
      >
        <PageContainer className="py-6 pb-28">
          {activeTab === 'recuerdos' && (
            <BaulFeedTabContainer
              baulId={baul.id}
              baulName={baul.name}
              onOpenChapter={(chapterId) => handleSelectChapter({ id: chapterId })}
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

      {isLoadingChapterPhotos && <BlockingLoadingOverlay message="Cargando fotos..." />}
    </div>
  );
};
