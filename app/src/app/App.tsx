import React, { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { ProfileMenuModal } from './components/ProfileMenuModal';
import { PlanLimitModal } from './components/PlanLimitModal';
import { Toast } from './components/Toast';
import { supabase } from '../services/base';
import { getSession } from '../services/auth.service';
import { Baul } from '@/types';

// Auth and Route Guards
import { ProtectedRoute, PublicRoute } from './routes/AuthGuards';

// Route Components
import { WelcomeRoute } from '../features/auth/components/WelcomeRoute';
import { AuthLoadingRoute } from '../features/auth/components/AuthLoadingRoute';
import { OnboardingRoute } from '../features/auth/components/OnboardingRoute';
import { EmptyBaulesRoute } from '../features/baules/components/EmptyBaulesRoute';
import { BaulesListRoute } from '../features/baules/components/BaulesListRoute';
import { CreateBaulRoute } from '../features/baules/components/CreateBaulRoute';
import { BaulRoute } from '../features/baules/components/BaulRoute';
import { CreateAlbumFormRoute } from '../features/albums/components/CreateAlbumFormRoute';
import { AlbumRoute } from '../features/albums/components/AlbumRoute';
import { PhotoViewerRoute } from '../features/photos/components/PhotoViewerRoute';
import { FilePickerRoute } from '../features/photos/components/FilePickerRoute';
import { UploadConfirmationRoute } from '../features/photos/components/UploadConfirmationRoute';
import { UploadingRoute } from '../features/photos/components/UploadingRoute';
import { UploadSuccessRoute } from '../features/photos/components/UploadSuccessRoute';
import { UploadErrorRoute } from '../features/photos/components/UploadErrorRoute';
import { PeopleWithAccessRoute } from '../features/sharing/components/PeopleWithAccessRoute';
import { AccessRequestsRoute } from '../features/sharing/components/AccessRequestsRoute';
import { RequestAccessRoute } from '../features/sharing/components/RequestAccessRoute';
import { RemovalRequestsRoute } from '../features/sharing/components/RemovalRequestsRoute';
import { BaulInvitacionRoute } from '../features/sharing/components/BaulInvitacionRoute';
import { AcceptInviteRoute } from '../features/sharing/components/AcceptInviteRoute';
import { ActivityCenterRoute } from '../features/activity/components/ActivityCenterRoute';
import { ProfileRoute } from '../features/profile/components/ProfileRoute';
import { SubscriptionRoute } from '../features/profile/components/SubscriptionRoute';
import { PlanSelectionRoute } from '../features/profile/components/PlanSelectionRoute';
import { PaymentRoute } from '../features/profile/components/PaymentRoute';

import { useUIStore } from '../store/uiStore';
import { useDataStore } from '../store/dataStore';
import { useAuthStore } from '../store/authStore';

function App() {
  const navigate = useNavigate();
  const location = useLocation();
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
    loadUserData: storeLoadUserData,
    setBaules: storeSetBaules,
  } = useDataStore();

  const {
    setAccessToken,
    userProfile,
    subscription,
    setSubscription,
    loadUserProfile,
    signOut: storeSignOut
  } = useAuthStore();
  
  // Check for existing session on mount
  useEffect(() => {
    checkSession();
  }, []);

  // Auth listener
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session);
      
      if (event === 'SIGNED_IN' && session) {
        setAccessToken(session.access_token);
        await loadUserData(session.access_token, session.user);
        
        // Si hay un redirectTo en la URL de auth-loading, AuthLoadingRoute se encargará.
        // Pero si estamos en '/' o en un flujo donde no hay AuthLoadingRoute intermedio:
        if (location.pathname === '/') {
          const params = new URLSearchParams(location.search);
          const redirectTo = params.get('redirectTo');
          if (redirectTo) {
            navigate(redirectTo);
          } else {
            navigate('/baules');
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setAccessToken(null);
        storeSetBaules([]);
        navigate('/');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const checkSession = async () => {
    try {
      const session = await getSession();
      
      if (session) {
        setAccessToken(session.access_token);
        await loadUserData(session.access_token, session.user);
        if (location.pathname === '/') {
          const params = new URLSearchParams(location.search);
          const redirectTo = params.get('redirectTo');
          if (redirectTo) {
            navigate(redirectTo);
          } else {
            navigate('/baules');
          }
        }
      } else {
        // Only navigate to home if not already on a public route or onboarding
        if (
          location.pathname !== '/' && 
          !location.pathname.startsWith('/solicitar-acceso') &&
          !location.pathname.startsWith('/invitacion') &&
          !location.pathname.startsWith('/onboarding')
        ) {
          navigate('/');
        }
      }
    } catch (error) {
      console.error('Error checking session:', error);
      navigate('/');
    }
  };

  const loadUserData = async (token: string, supabaseUser?: any) => {
    try {
      // Load user profile and data via stores
      await Promise.all([
        loadUserProfile(token, supabaseUser),
        storeLoadUserData(token)
      ]);
      
      const currentBaules = useDataStore.getState().baules;
      
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
        // Solo redirigir automáticamente si no hay un redirectTo pendiente
        const params = new URLSearchParams(location.search);
        const hasRedirectTo = params.has('redirectTo');
        
        if (!hasRedirectTo && (location.pathname === '/' || location.pathname === '/empty' || location.pathname === '/auth-loading')) {
          navigate('/baules', { replace: true });
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      navigate('/');
    }
  };

  const handleSignOut = async () => {
    try {
      await storeSignOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  return (
    <div className="h-screen w-full bg-[var(--bg-primary)]">
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={
          <PublicRoute>
            <WelcomeRoute />
          </PublicRoute>
        } />
        <Route path="/auth-loading" element={<AuthLoadingRoute />} />
        <Route path="/solicitar-acceso/:baulId" element={<RequestAccessRoute />} />
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
        <Route path="/baules/:baulId/albumes/:albumId/subir" element={
          <ProtectedRoute>
            <FilePickerRoute />
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
        <Route path="/baules/:baulId/albumes/:albumId/exito" element={
          <ProtectedRoute>
            <UploadSuccessRoute navigate={navigate} />
          </ProtectedRoute>
        } />
        <Route path="/baules/:baulId/albumes/:albumId/error" element={
          <ProtectedRoute>
            <UploadErrorRoute navigate={navigate} />
          </ProtectedRoute>
        } />
        <Route path="/personas/:baulId" element={
          <ProtectedRoute>
            <PeopleWithAccessRoute />
          </ProtectedRoute>
        } />
        <Route path="/solicitudes/:baulId" element={
          <ProtectedRoute>
            <AccessRequestsRoute />
          </ProtectedRoute>
        } />
        <Route path="/invitacion/:baulId" element={
          <BaulInvitacionRoute />
        } />
        <Route path="/invitacion/:baulId/aceptar" element={
          <ProtectedRoute>
            <AcceptInviteRoute />
          </ProtectedRoute>
        } />
        <Route path="/eliminar-solicitudes/:baulId" element={
          <ProtectedRoute>
            <RemovalRequestsRoute />
          </ProtectedRoute>
        } />
        
        <Route path="/actividad" element={
          <ProtectedRoute>
            <ActivityCenterRoute />
          </ProtectedRoute>
        } />
        <Route path="/perfil" element={
          <ProtectedRoute>
            <ProfileRoute />
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
      </Routes>
      
      {/* Profile Menu Modal */}
      {showProfileMenu && (
        <ProfileMenuModal
          userEmail={userProfile.email}
          onClose={() => setShowProfileMenu(false)}
          onNavigateToProfile={() => {
            setShowProfileMenu(false);
            navigate('/perfil');
          }}
          onNavigateToSubscription={() => {
            setShowProfileMenu(false);
            navigate('/suscripcion');
          }}
          onSignOut={() => {
            setShowProfileMenu(false);
            handleSignOut();
          }}
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