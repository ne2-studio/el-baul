import React, { useState } from 'react';
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
import { BaulPersonasTabContainer } from '@/features/people/containers/BaulPersonasTabContainer';
import { BaulRecuerdosTabContainer } from '@/features/memories/containers/BaulRecuerdosTabContainer';
import { BaulSettingsMenuContainer } from '@/features/baules/containers/BaulSettingsMenuContainer';
import { WorkspaceSwitcherContainer } from '@/features/baules/containers/WorkspaceSwitcherContainer';
import { useBaulesStore } from '@/store/useBaulesStore';
import { usePersonasStore } from '@/store/usePersonasStore';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
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
  const { baulRecuerdos } = useRecuerdosStore();
  const setShowProfileMenu = useUIStore((state) => state.setShowProfileMenu);

  const [isLoadingChapterPhotos, setIsLoadingChapterPhotos] = useState(false);
  const [headerRef, headerHeight] = useElementHeight<HTMLDivElement>();
  const initialTab = (location.state as { activeTab?: BaulTab } | null)?.activeTab ?? 'capitulos';
  const [activeTab, setActiveTab] = useState<BaulTab>(initialTab);

  const baulScope = useBaulScope(baulId);
  const guard = guardBaulScope(baulScope, { loadingLabel: 'Abriendo baúl...' });
  if (!guard.ready) return guard.screen;
  const { baul } = guard;

  const baulPermissions = getBaulPermissions(baul);

  const handleSelectChapter = async (chapter: { id: string }) => {
    if (!auth.isAuthenticated) return;
    setIsLoadingChapterPhotos(true);
    const result = await run(() => loadChapterPhotos(chapter.id), { errorMessage: 'Error al cargar las fotos' });
    setIsLoadingChapterPhotos(false);
    if (result.ok) navigate(`/baules/${baul.id}/capitulos/${chapter.id}`);
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
          { key: 'capitulos', label: 'Capítulos', count: (chapters[baul.id] || []).length },
          { key: 'recuerdos', label: 'Recuerdos', count: (baulRecuerdos[baul.id] || []).length },
          { key: 'personas', label: 'Personas', count: (personas[baul.id] || []).length },
        ]}
        active={activeTab}
        onChange={(key) => setActiveTab(key as BaulTab)}
        top={headerHeight}
      >
        <PageContainer className="py-6 pb-28">
          {activeTab === 'capitulos' && (
            <BaulChaptersTabContainer baulId={baul.id} onSelectChapter={handleSelectChapter} />
          )}

          {activeTab === 'personas' && (
            <BaulPersonasTabContainer baulId={baul.id} canCreatePersona={baulPermissions.canCreatePersona} />
          )}

          {activeTab === 'recuerdos' && (
            <BaulRecuerdosTabContainer
              baulId={baul.id}
              baulName={baul.name}
              onOpenChapter={(chapterId) => handleSelectChapter({ id: chapterId })}
            />
          )}
        </PageContainer>
      </Tabbar>

      {isLoadingChapterPhotos && <BlockingLoadingOverlay message="Cargando fotos..." />}
    </div>
  );
};
