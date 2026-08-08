import React, { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { ProfileMenuModal } from '@/features/profile/components/ProfileMenuModal';
import { PlanLimitModal } from '@/features/profile/components/PlanLimitModal';
import { Toast } from '@/design-system/components/feedback/Toast';
import { AccessDeniedScreen } from '@/design-system/components/feedback/AccessDeniedScreen';
import { NativeShareHandler } from '@/features/sharing/native/NativeShareHandler';
import { ScrollToTop } from '@/app/ScrollToTop';
import { API_FORBIDDEN_EVENT, API_UNAUTHORIZED_EVENT, setAccessToken } from '@/api';
import { Baul } from '@/types';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { getBaulPermissions } from '@/utils/roleUtils';

// Auth and Route Guards
import { ProtectedRoute, PublicRoute } from './routes/AuthGuards';

// Route Components
import { WelcomeRoute } from '../features/auth/routes/WelcomeRoute';
import { CallbackRoute } from '../features/auth/routes/CallbackRoute';
import { OnboardingRoute } from '../features/auth/routes/OnboardingRoute';
import { HomeRedirectRoute } from '../features/baules/routes/HomeRedirectRoute';
import { CreateBaulRoute } from '../features/baules/routes/CreateBaulRoute';
import { BaulRoute } from '../features/baules/routes/BaulRoute';
import { AiChatRoute } from '../features/chat/routes/AiChatRoute';
import { RequestBaulDeletionRoute } from '../features/baules/routes/RequestBaulDeletionRoute';
import { CreateChapterModalRoute } from '../features/chapters/routes/CreateChapterModalRoute';
import { ChapterRoute } from '../features/chapters/routes/ChapterRoute';
import { UploadConfirmationRoute } from '../features/photos/routes/UploadConfirmationRoute';
import { UploadingRoute } from '../features/photos/routes/UploadingRoute';
import { UploadErrorRoute } from '../features/photos/routes/UploadErrorRoute';
import { RemovalRequestsRoute } from '../features/photos/routes/RemovalRequestsRoute';
import { PhotoBatchGridRoute } from '../features/photos/routes/PhotoBatchGridRoute';
import { PersonaDetailRoute } from '../features/people/routes/PersonaDetailRoute';
import { BaulGlobalInvitacionRoute } from '../features/sharing/routes/BaulGlobalInvitacionRoute';
import { AcceptBaulInviteRoute } from '../features/sharing/routes/AcceptBaulInviteRoute';
import { SelectBaulForShareRoute } from '../features/sharing/routes/SelectBaulForShareRoute';
import { ProfileRoute } from '../features/profile/routes/ProfileRoute';
import { NotificationPreferencesRoute } from '../features/profile/routes/NotificationPreferencesRoute';
import { SubscriptionRoute } from '../features/profile/routes/SubscriptionRoute';
import { PlanSelectionRoute } from '../features/profile/routes/PlanSelectionRoute';
import { PaymentRoute } from '../features/profile/routes/PaymentRoute';
import { HelpSupportRoute } from '../features/support/routes/HelpSupportRoute';
import { SupportFormRoute } from '../features/support/routes/SupportFormRoute';
import { photoViewerRoutes } from '../features/photos/viewerNavigation/routes';
import { getBackgroundLocation } from '../features/photos/viewerNavigation';

import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/useAuthStore';
import { useBaulesStore } from '../store/useBaulesStore';
import { useAppConfigStore } from '../store/useAppConfigStore';
import { loadUserData, resetAllStores } from '@/features/auth/useCases';

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  const [isAccessDenied, setIsAccessDenied] = React.useState(false);
  const monetizationEnabled = useAppConfigStore(state => state.monetizationEnabled);
  const {
    showToast,
    toastMessage,
    toastVariant,
    hideToast,
    showProfileMenu,
    setShowProfileMenu,
    showPlanLimitModal,
    setShowPlanLimitModal
  } = useUIStore();

  const {
    subscription,
    setSubscription,
    setAuthenticated,
  } = useAuthStore();

  const { run, isPending } = useAsyncAction();

  const backgroundLocation = getBackgroundLocation(location);

  // Loaded once per session; features gated by it stay off until the fetch resolves.
  useEffect(() => {
    useAppConfigStore.getState().fetchAppConfig();
  }, []);

  // Mirrored into api.ts synchronously during render, not in an effect: on a hard refresh,
  // ProtectedRoute can let a deep child route mount in the very same commit where
  // auth.isAuthenticated first flips to true, and passive effects fire child-first — a
  // child's data-loading effect (e.g. useBaulScope) would then run before this component's
  // own effect got a chance to push the token, calling the API with none attached and
  // getting a 401. A plain synchronous assignment has no such ordering risk.
  setAccessToken(auth.user?.access_token ?? null);

  useEffect(() => {
    const handleForbidden = () => setIsAccessDenied(true);
    window.addEventListener(API_FORBIDDEN_EVENT, handleForbidden);
    return () => window.removeEventListener(API_FORBIDDEN_EVENT, handleForbidden);
  }, []);

  // A 401 means the API rejected the access token we sent (expired/invalid session) — the
  // OIDC client's own isAuthenticated wouldn't notice this on its own (nothing here watches
  // token expiry), so without this we'd otherwise be stuck showing generic error toasts on a
  // page the user can never use again until a manual reload. Reads window.location rather
  // than the `location` from useLocation() for the same staleness reason as handleLoadUserData
  // above: this listener is registered once, so a closed-over `location` would go stale the
  // moment the user navigates.
  useEffect(() => {
    const handleUnauthorized = () => {
      resetAllStores();
      auth.removeUser();
      const redirectTo = encodeURIComponent(window.location.pathname + window.location.search);
      navigate(`/?redirectTo=${redirectTo}`, { replace: true });
    };
    window.addEventListener(API_UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(API_UNAUTHORIZED_EVENT, handleUnauthorized);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // (Re)load domain data whenever the OIDC user changes.
  useEffect(() => {
    setAuthenticated(auth.isAuthenticated);

    if (auth.isAuthenticated) {
      handleLoadUserData();
    } else {
      resetAllStores();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated, auth.user]);

  const handleLoadUserData = async () => {
    const result = await run(() => loadUserData(), {
      key: 'loadUserData',
      errorMessage: 'No se pudieron cargar tus baúles. Comprueba tu conexión e inténtalo de nuevo.',
    });
    if (!result.ok) return;

    const currentBaules = useBaulesStore.getState().baules;

    // Update subscription usage
    const custodianBaules = currentBaules.filter((b: Baul) => getBaulPermissions(b).isCustodio);
    setSubscription(prev => ({
      ...prev,
      baulesUsed: custodianBaules.length
    }));

    // No further navigation here: CallbackRoute/PublicRoute already send an authenticated user
    // to "/baules", and HomeRedirectRoute (mounted there) owns the actual decision of where
    // that resolves to (CurrentBaul, first baúl, or onboarding/crear-baúl) — see
    // resolveHomeDestination. Keeping a single source of truth avoids this effect racing that
    // route's own resolution with a different criterion.
  };

  const handleSignOut = async (): Promise<boolean> => {
    // signoutRedirect() limpia el usuario local ANTES de construir la petición a
    // end_session, así que aunque el proveedor no la soporte (fake-oidc en local/E2E) o la
    // navegación falle, el cierre de sesión local ya se ha completado — no es un fallo real.
    // Si el proveedor sí soporta end_session (Zitadel real), esta llamada nunca resuelve:
    // navega fuera de la app antes de que la promesa se cumpla.
    const result = await run(
      async () => {
        try {
          await auth.signoutRedirect();
        } catch (error) {
          console.warn('El proveedor OIDC no completó el end_session:', error);
        }
      },
      { key: 'signOut' }
    );
    if (!result.ok) return false;

    resetAllStores();
    navigate('/');
    return true;
  };

  const handleBackToBaules = () => {
    setIsAccessDenied(false);
    navigate('/baules', { replace: true });
  };

  return (
    <div className="h-screen w-full bg-[var(--bg-primary)]">
      <ScrollToTop />
      <NativeShareHandler />

      {isAccessDenied ? (
        <AccessDeniedScreen onBackToBaules={handleBackToBaules} />
      ) : (
        <>

      <Routes location={backgroundLocation || location}>
        {/* Public Routes */}
        <Route path="/" element={
          <PublicRoute>
            <WelcomeRoute />
          </PublicRoute>
        } />
        <Route path="/callback" element={<CallbackRoute />} />
        <Route path="/onboarding" element={<OnboardingRoute />} />

        {/* Protected Routes */}
        <Route path="/baules" element={
          <ProtectedRoute>
            <HomeRedirectRoute />
          </ProtectedRoute>
        } />
        <Route path="/baules/nuevo" element={
          <ProtectedRoute>
            <CreateBaulRoute />
          </ProtectedRoute>
        } />

        <Route path="/baules/:baulId" element={
          <ProtectedRoute>
            <BaulRoute />
          </ProtectedRoute>
        } />
        <Route path="/baules/:baulId/recordar" element={
          <ProtectedRoute>
            <AiChatRoute />
          </ProtectedRoute>
        } />
        <Route path="/baules/:baulId/personas/:personaId" element={
          <ProtectedRoute>
            <PersonaDetailRoute />
          </ProtectedRoute>
        } />
        <Route path="/baules/:baulId/solicitar-borrado" element={
          <ProtectedRoute>
            <RequestBaulDeletionRoute />
          </ProtectedRoute>
        } />
        <Route path="/baules/:baulId/nuevo-capitulo" element={
          <ProtectedRoute>
            <CreateChapterModalRoute />
          </ProtectedRoute>
        } />
        <Route path="/baules/:baulId/capitulos/:chapterId" element={
          <ProtectedRoute>
            <ChapterRoute />
          </ProtectedRoute>
        } />
        <Route path="/baules/:baulId/capitulos/:chapterId/confirmar" element={
          <ProtectedRoute>
            <UploadConfirmationRoute />
          </ProtectedRoute>
        } />
        <Route path="/baules/:baulId/capitulos/:chapterId/subiendo" element={
          <ProtectedRoute>
            <UploadingRoute />
          </ProtectedRoute>
        } />
        <Route path="/baules/:baulId/capitulos/:chapterId/error" element={
          <ProtectedRoute>
            <UploadErrorRoute navigate={navigate} />
          </ProtectedRoute>
        } />
        <Route path="/baules/:baulId/fotos-sueltas" element={
          <ProtectedRoute>
            <ChapterRoute />
          </ProtectedRoute>
        } />
        <Route path="/baules/:baulId/fotos-sueltas/confirmar" element={
          <ProtectedRoute>
            <UploadConfirmationRoute />
          </ProtectedRoute>
        } />
        <Route path="/baules/:baulId/fotos-sueltas/subiendo" element={
          <ProtectedRoute>
            <UploadingRoute />
          </ProtectedRoute>
        } />
        <Route path="/baules/:baulId/fotos-sueltas/error" element={
          <ProtectedRoute>
            <UploadErrorRoute navigate={navigate} />
          </ProtectedRoute>
        } />
        <Route path="/baules/:baulId/subida/:batchId" element={
          <ProtectedRoute>
            <PhotoBatchGridRoute />
          </ProtectedRoute>
        } />
        <Route path="/invitacion/baul/:token" element={
          <BaulGlobalInvitacionRoute />
        } />
        <Route path="/invitacion/baul/:token/aceptar" element={
          <ProtectedRoute>
            <AcceptBaulInviteRoute />
          </ProtectedRoute>
        } />
        <Route path="/eliminar-solicitudes/:baulId" element={
          <ProtectedRoute>
            <RemovalRequestsRoute />
          </ProtectedRoute>
        } />
        <Route path="/compartir" element={
          <ProtectedRoute>
            <SelectBaulForShareRoute />
          </ProtectedRoute>
        } />

        <Route path="/perfil" element={
          <ProtectedRoute>
            <ProfileRoute />
          </ProtectedRoute>
        } />
        <Route path="/configuracion/notificaciones" element={
          <ProtectedRoute>
            <NotificationPreferencesRoute />
          </ProtectedRoute>
        } />
        <Route path="/suscripcion" element={
          <ProtectedRoute>
            <SubscriptionRoute />
          </ProtectedRoute>
        } />
        <Route path="/planes" element={
          <ProtectedRoute>
            <PlanSelectionRoute />
          </ProtectedRoute>
        } />
        <Route path="/pago" element={
          <ProtectedRoute>
            <PaymentRoute />
          </ProtectedRoute>
        } />
        <Route path="/ayuda" element={
          <ProtectedRoute>
            <HelpSupportRoute />
          </ProtectedRoute>
        } />
        <Route path="/ayuda/problema" element={
          <ProtectedRoute>
            <SupportFormRoute category="Bug" title="Informar de un problema" />
          </ProtectedRoute>
        } />
        <Route path="/ayuda/sugerencia" element={
          <ProtectedRoute>
            <SupportFormRoute category="Suggestion" title="Enviar una sugerencia" />
          </ProtectedRoute>
        } />
        <Route path="/ayuda/soporte" element={
          <ProtectedRoute>
            <SupportFormRoute category="Support" title="Hablar con soporte" />
          </ProtectedRoute>
        } />

        {photoViewerRoutes.map(({ path, element }) => <Route key={path} path={path} element={element} />)}
      </Routes>

      {/* Visor de foto como overlay: solo se pinta cuando hay una pantalla de fondo que
          preservar (ver backgroundLocation arriba). Coincide con la ubicación real (no con
          backgroundLocation), así que se muestra encima de la pantalla de fondo sin desmontarla. */}
      {backgroundLocation && (
        <Routes>
          {photoViewerRoutes.map(({ path, element }) => <Route key={path} path={path} element={element} />)}
        </Routes>
      )}
        </>
      )}

      {/* Profile Menu Modal */}
      {showProfileMenu && (
        <ProfileMenuModal
          monetizationEnabled={monetizationEnabled}
          onClose={() => setShowProfileMenu(false)}
          onNavigateToProfile={() => {
            setShowProfileMenu(false);
            navigate('/perfil');
          }}
          onNavigateToSubscription={() => {
            setShowProfileMenu(false);
            navigate('/suscripcion');
          }}
          onNavigateToNotifications={() => {
            setShowProfileMenu(false);
            navigate('/configuracion/notificaciones');
          }}
          onNavigateToHelp={() => {
            setShowProfileMenu(false);
            navigate('/ayuda');
          }}
          onSignOut={async () => {
            const signedOut = await handleSignOut();
            if (signedOut) setShowProfileMenu(false);
          }}
          isSigningOut={isPending('signOut')}
        />
      )}

      {/* Plan Limit Modal */}
      {showPlanLimitModal && (
        <PlanLimitModal
          baulesUsed={subscription.baulesUsed}
          baulesLimit={subscription.baulesLimit}
          onClose={() => setShowPlanLimitModal(false)}
          onUpgradePlan={() => {
            setShowPlanLimitModal(false);
            navigate('/planes');
          }}
        />
      )}

      {/* Toast */}
      {showToast && (
        <Toast
          message={toastMessage}
          variant={toastVariant}
          onClose={hideToast}
        />
      )}
    </div>
  );
}

export default App;
