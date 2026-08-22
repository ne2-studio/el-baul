import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { PageHeader } from '@/design-system/layouts/PageHeader';
import { Tabbar } from '@/design-system/layouts/Tabbar';
import { useElementHeight } from '@/hooks/useElementHeight';
import { BaulChaptersTabContainer } from '@/features/baules/containers/BaulChaptersTabContainer';
import { ContributionSuggestionGateContainer } from '@/features/contributions/containers/ContributionSuggestionGateContainer';
import { BaulPersonasTabContainer } from '@/features/people/containers/BaulPersonasTabContainer';
import { BaulFeedTabContainer } from '@/features/memories/containers/BaulFeedTabContainer';
import { BaulSettingsMenuContainer } from '@/features/baules/containers/BaulSettingsMenuContainer';
import { WorkspaceSwitcherContainer } from '@/features/baules/containers/WorkspaceSwitcherContainer';
import { useUIStore } from '@/store/uiStore';
import { getEntrySource } from '@/utils/entrySource';
import { useBaulScope } from '@/hooks/useBaulScope';
import { guardBaulScope } from '@/hooks/baulScopeGuard';
import { getBaulPermissions } from '@/utils/roleUtils';
import { readBaulScrollPosition, saveBaulScrollPosition } from './baulScrollRestoration';

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

  const startContributionSuggestionCooldown = useUIStore((state) => state.startContributionSuggestionCooldown);

  const [headerRef, headerHeight] = useElementHeight<HTMLDivElement>();
  const initialTab = (location.state as { activeTab?: BaulTab } | null)?.activeTab ?? 'recuerdos';
  const [activeTab, setActiveTab] = useState<BaulTab>(initialTab);
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

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        ref={headerRef}
        variant="row"
        leading={<WorkspaceSwitcherContainer activeBaul={baul} />}
        trailing={
          <div className="flex items-center gap-1">
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
            // Sin badge de recuento — un número aquí no comunica nada útil; el feed ya
            // distingue lo nuevo con su propia swimlane (ver FeedTab).
            label: 'Historia',
          },
          { key: 'capitulos', label: 'Capítulos' },
          // "Familia" solo aquí, en la Tabbar del baúl — mismo motivo que "Historia" arriba.
          { key: 'personas', label: 'Familia' },
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
    </div>
  );
};
