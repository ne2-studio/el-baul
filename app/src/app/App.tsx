import React, { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { ProfileMenuModal } from './components/ProfileMenuModal';
import { PlanLimitModal } from './components/PlanLimitModal';
import { Toast } from './components/Toast';
import { NativeShareHandler } from './components/NativeShareHandler';
import { ScrollToTop } from './components/ScrollToTop';
import { setAccessToken } from '@/api';
import { Baul } from '@/types';
import { useAsyncAction } from '@/hooks/useAsyncAction';

// Auth and Route Guards
import { ProtectedRoute, PublicRoute } from './routes/AuthGuards';

// Route Components
import { WelcomeRoute } from '../features/auth/components/WelcomeRoute';
import { CallbackRoute } from '../features/auth/components/CallbackRoute';
import { OnboardingRoute } from '../features/auth/components/OnboardingRoute';
import { EmptyBaulesRoute } from '../features/baules/components/EmptyBaulesRoute';
import { BaulesListRoute } from '../features/baules/components/BaulesListRoute';
import { CreateBaulRoute } from '../features/baules/components/CreateBaulRoute';
import { BaulRoute } from '../features/baules/components/BaulRoute';
import { RequestBaulDeletionRoute } from '../features/baules/components/RequestBaulDeletionRoute';
import { CreateAlbumFormRoute } from '../features/albums/components/CreateAlbumFormRoute';
import { AlbumRoute } from '../features/albums/components/AlbumRoute';
import { PhotoViewerRoute } from '../features/photos/components/PhotoViewerRoute';
import { UploadConfirmationRoute } from '../features/photos/components/UploadConfirmationRoute';
import { UploadingRoute } from '../features/photos/components/UploadingRoute';
import { UploadErrorRoute } from '../features/photos/components/UploadErrorRoute';
import { LoosePhotosRoute } from '../features/photos/components/LoosePhotosRoute';
import { LoosePhotoViewerRoute } from '../features/photos/components/LoosePhotoViewerRoute';
import { LooseUploadConfirmationRoute } from '../features/photos/components/LooseUploadConfirmationRoute';
import { LooseUploadingRoute } from '../features/photos/components/LooseUploadingRoute';
import { LooseUploadErrorRoute } from '../features/photos/components/LooseUploadErrorRoute';
import { RemovalRequestsRoute } from '../features/sharing/components/RemovalRequestsRoute';
import { PersonaDetailRoute } from '../features/sharing/components/PersonaDetailRoute';
import { BaulInvitacionRoute } from '../features/sharing/components/BaulInvitacionRoute';
import { AcceptInviteRoute } from '../features/sharing/components/AcceptInviteRoute';
import { SelectBaulForShareRoute } from '../features/sharing/components/SelectBaulForShareRoute';
import { ProfileRoute } from '../features/profile/components/ProfileRoute';
import { NotificationPreferencesRoute } from '../features/profile/components/NotificationPreferencesRoute';
import { SubscriptionRoute } from '../features/profile/components/SubscriptionRoute';
import { PlanSelectionRoute } from '../features/profile/components/PlanSelectionRoute';
import { PaymentRoute } from '../features/profile/components/PaymentRoute';
import { HelpSupportRoute } from '../features/support/components/HelpSupportRoute';
import { SupportFormRoute } from '../features/support/components/SupportFormRoute';

import { useUIStore } from '../store/uiStore';
import { useAppStore } from '../store/useAppStore';
import { useAppConfigStore } from '../store/useAppConfigStore';

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  const monetizationEnabled = useAppConfigStore(state => state.monetizationEnabled);
  const {
    showToast,
    toastMessage,
    hideToast,
    showProfileMenu,
    setShowProfileMenu,
    showPlanLimitModal,
    setShowPlanLimitModal
  } = useUIStore();

  const {
    userProfile,
    subscription,
    setSubscription,
    setAuthenticated,
    fetchData,
    reset
  } = useAppStore();

  const { run, isPending } = useAsyncAction();

  // Loaded once per session; features gated by it stay off until the fetch resolves.
  useEffect(() => {
    useAppConfigStore.getState().fetchAppConfig();
  }, []);

  // Redirect to sign-in whenever the user isn't authenticated and isn't on a public route.
  useEffect(() => {
    if (auth.isLoading || auth.isAuthenticated || location.pathname === '/callback') return;

    const isPublicPath =
      location.pathname === '/' ||
      location.pathname.startsWith('/invitacion') ||
      location.pathname.startsWith('/onboarding');

    if (!isPublicPath) {
      navigate('/');
    }
  }, [auth.isLoading, auth.isAuthenticated, location.pathname, navigate]);

  // Push the token into api.ts and (re)load domain data whenever the OIDC user changes.
  useEffect(() => {
    setAccessToken(auth.user?.access_token ?? null);
    setAuthenticated(auth.isAuthenticated);

    if (auth.isAuthenticated) {
      loadUserData();
    } else {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated, auth.user]);

  const loadUserData = async () => {
    const result = await run(() => fetchData(), {
      key: 'loadUserData',
      errorMessage: 'No se pudieron cargar tus baúles. Comprueba tu conexión e inténtalo de nuevo.',
    });
    if (!result.ok) return;

    const currentBaules = useAppStore.getState().baules;

    // Update subscription usage
    const custodianBaules = currentBaules.filter((b: Baul) => b.isCustodio);
    setSubscription(prev => ({
      ...prev,
      baulesUsed: custodianBaules.length
    }));

    // Navigate to appropriate screen
    if (currentBaules.length === 0) {
      if (location.pathname === '/baules') {
        navigate('/empty');
      }
    } else {
      // /callback is excluded here: CallbackRoute owns navigation away from it, reading
      // redirectTo from the OIDC state (not a query param, unlike this check).
      const params = new URLSearchParams(location.search);
      const hasRedirectTo = params.has('redirectTo');

      if (!hasRedirectTo && (location.pathname === '/' || location.pathname === '/empty')) {
        navigate('/baules', { replace: true });
      }
    }
  };

  const handleSignOut = async (): Promise<boolean> => {
    // auth.removeUser() se espera ANTES de limpiar el estado local: si falla, el usuario
    // se queda con la sesión (y los datos) tal cual estaban, en vez de ver un estado ya
    // vacío sin haber cerrado sesión de verdad en el proveedor OIDC.
    const result = await run(() => auth.removeUser(), {
      key: 'signOut',
      errorMessage: 'Error al cerrar sesión',
    });
    if (!result.ok) return false;

    reset();
    navigate('/');
    return true;
  };

  return (
    <div className="h-screen w-full bg-[var(--bg-primary)]">
      <ScrollToTop />
      <NativeShareHandler />

      <Routes>
        {/* Public Routes */}
        <Route path="/" element={
          <PublicRoute>
            <WelcomeRoute />
          </PublicRoute>
        } />
        <Route path="/callback" element={<CallbackRoute />} />
        <Route path="/onboarding" element={<OnboardingRoute />} />

        {/* Protected Routes */}
        <Route path="/empty" element={
          <ProtectedRoute>
            <EmptyBaulesRoute />
          </ProtectedRoute>
        } />
        <Route path="/baules" element={
          <ProtectedRoute>
            <BaulesListRoute />
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
        <Route path="/baules/:baulId/personas/:sharedUserId" element={
          <ProtectedRoute>
            <PersonaDetailRoute />
          </ProtectedRoute>
        } />
        <Route path="/baules/:baulId/solicitar-borrado" element={
          <ProtectedRoute>
            <RequestBaulDeletionRoute />
          </ProtectedRoute>
        } />
        <Route path="/baules/:baulId/nuevo-album" element={
          <ProtectedRoute>
            <CreateAlbumFormRoute />
          </ProtectedRoute>
        } />
        <Route path="/baules/:baulId/albumes/:albumId" element={
          <ProtectedRoute>
            <AlbumRoute />
          </ProtectedRoute>
        } />
        <Route path="/baules/:baulId/albumes/:albumId/foto/:photoId" element={
          <ProtectedRoute>
            <PhotoViewerRoute />
          </ProtectedRoute>
        } />
        <Route path="/baules/:baulId/albumes/:albumId/confirmar" element={
          <ProtectedRoute>
            <UploadConfirmationRoute />
          </ProtectedRoute>
        } />
        <Route path="/baules/:baulId/albumes/:albumId/subiendo" element={
          <ProtectedRoute>
            <UploadingRoute />
          </ProtectedRoute>
        } />
        <Route path="/baules/:baulId/albumes/:albumId/error" element={
          <ProtectedRoute>
            <UploadErrorRoute navigate={navigate} />
          </ProtectedRoute>
        } />
        <Route path="/baules/:baulId/fotos-sueltas" element={
          <ProtectedRoute>
            <LoosePhotosRoute />
          </ProtectedRoute>
        } />
        <Route path="/baules/:baulId/fotos-sueltas/foto/:photoId" element={
          <ProtectedRoute>
            <LoosePhotoViewerRoute />
          </ProtectedRoute>
        } />
        <Route path="/baules/:baulId/fotos-sueltas/confirmar" element={
          <ProtectedRoute>
            <LooseUploadConfirmationRoute />
          </ProtectedRoute>
        } />
        <Route path="/baules/:baulId/fotos-sueltas/subiendo" element={
          <ProtectedRoute>
            <LooseUploadingRoute />
          </ProtectedRoute>
        } />
        <Route path="/baules/:baulId/fotos-sueltas/error" element={
          <ProtectedRoute>
            <LooseUploadErrorRoute navigate={navigate} />
          </ProtectedRoute>
        } />
        <Route path="/invitacion/persona/:sharedUserId" element={
          <BaulInvitacionRoute />
        } />
        <Route path="/invitacion/persona/:sharedUserId/aceptar" element={
          <ProtectedRoute>
            <AcceptInviteRoute />
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
      </Routes>

      {/* Profile Menu Modal */}
      {showProfileMenu && (
        <ProfileMenuModal
          userEmail={userProfile.email}
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
          onClose={hideToast}
        />
      )}
    </div>
  );
}

export default App;
