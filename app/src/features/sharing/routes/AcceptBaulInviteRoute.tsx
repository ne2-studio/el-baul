import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { usePostHog } from 'posthog-js/react';
import { hashInviteToken } from '@/features/sharing/inviteTokenHash';
import { appendEntrySource } from '@/utils/entrySource';
import { useUIStore } from '@/store/uiStore';
import { useCurrentBaulStore } from '@/store/useCurrentBaulStore';
import { api } from '@/api';
import { Button } from '@/design-system/components/actions/Button';
import { BlockingLoadingOverlay } from '@/design-system/components/feedback/BlockingLoadingOverlay';

// Accepts a persona-scoped invite token — unlike the old global invite link, the token
// resolves directly to exactly one target persona, so there is no "¿Quién eres tú?" step
// (see PersonaInviteManager.AcceptAsync / the old ClaimPersonaScreen, removed).
export const AcceptBaulInviteRoute: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const auth = useAuth();
  const { showToastMessage } = useUIStore();
  const posthog = usePostHog();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const performAccept = async () => {
      if (!token || !auth.isAuthenticated) {
        if (!auth.isAuthenticated) {
          navigate(`/?redirectTo=${encodeURIComponent(appendEntrySource(`/invitacion/baul/${token}/aceptar`, 'link'))}`);
        } else {
          navigate('/baules');
        }
        return;
      }

      try {
        const persona = await api.personaInvites.accept(token);
        // Fire-and-forget: keep the hash off the join/navigation path.
        void hashInviteToken(token).then((inviteTokenHash) =>
          posthog.capture('invite_accepted', {
            baulId: persona.baulId,
            personaId: persona.id,
            inviteTokenHash,
          })
        );
        // El baúl al que se acaba de unir pasa a ser el CurrentBaul — es el que quiere usar
        // a continuación, no el que tuviera activo antes de aceptar la invitación.
        useCurrentBaulStore.getState().setCurrentBaulId(persona.baulId);
        // Pequeño delay para que se vea el estado de carga y sea más natural
        setTimeout(() => {
          navigate(`/baules/${persona.baulId}`);
        }, 1500);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al unirse al baúl';
        setError(message);
        showToastMessage(message, 'error');
      }
    };

    performAccept();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, auth.isAuthenticated, navigate]);

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
            <Button variant="plain"
              onClick={() => navigate('/baules')}
              className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-full font-medium hover:opacity-90 transition-opacity"
            >
              Ir a mis baúles
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <BlockingLoadingOverlay message="Uniéndose al baúl..." />;
};
