import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { useUIStore } from '@/store/uiStore';
import { api } from '@/api';

export const AcceptInviteRoute: React.FC = () => {
  const { sharedUserId } = useParams<{ sharedUserId: string }>();
  const navigate = useNavigate();
  const auth = useAuth();
  const { showToastMessage } = useUIStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const performAcceptInvite = async () => {
      if (!sharedUserId || !auth.isAuthenticated) {
        if (!auth.isAuthenticated) {
          navigate(`/?redirectTo=${encodeURIComponent(`/invitacion/persona/${sharedUserId}/aceptar`)}`);
        } else {
          navigate('/baules');
        }
        return;
      }

      try {
        const persona = await api.sharedUsers.acceptPersonalInvite(sharedUserId);
        // Pequeño delay para que se vea el estado de carga y sea más natural
        setTimeout(() => {
          navigate(`/baules/${persona.baulId}`);
        }, 1500);
      } catch (err: any) {
        const message = err.message || 'Error al unirse al baúl';
        setError(message);
        showToastMessage(message);
      }
    };

    performAcceptInvite();
  }, [sharedUserId, auth.isAuthenticated, navigate, showToastMessage]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-card rounded-2xl p-8 shadow-xl border border-border max-w-md w-full">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-foreground">Ups! Algo ha ido mal</h1>
            <p className="text-muted-foreground">{error}</p>
            <button
              onClick={() => navigate('/baules')}
              className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-full font-medium hover:opacity-90 transition-opacity"
            >
              Ir a mis baúles
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-card rounded-2xl p-8 shadow-2xl border border-border">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-foreground font-medium">Uniendose al baúl...</p>
        </div>
      </div>
    </div>
  );
};
