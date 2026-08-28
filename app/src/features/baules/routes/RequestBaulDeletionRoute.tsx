import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RequestBaulDeletionScreen } from '@/features/baules/components/RequestBaulDeletionScreen';
import { usePostHog } from 'posthog-js/react';
import { useBaulesStore } from '@/store/useBaulesStore';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { api } from '@/api';
import { getBaulPermissions } from '@/utils/roleUtils';

export const RequestBaulDeletionRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baulId } = useParams();
  const { baules } = useBaulesStore();
  const { run, isPending } = useAsyncAction();
  const posthog = usePostHog();

  const baul = baules.find((b) => b.id === baulId);
  const canRequestBaulDeletion = getBaulPermissions(baul).canRequestBaulDeletion;

  // Solo el custodio puede solicitar el borrado del baúl — cualquier otro rol (incluido
  // administrador) se redirige de vuelta, ya que la opción no debería ser accesible.
  useEffect(() => {
    if (baul && !canRequestBaulDeletion) navigate(`/baules/${baul.id}`, { replace: true });
  }, [baul, canRequestBaulDeletion, navigate]);

  if (!baul || !canRequestBaulDeletion) return <div className="p-8 text-center">Cargando baúl...</div>;

  const handleSubmit = async (reason: string) => {
    const message = `Solicitud de eliminación del baúl "${baul.name}" (ID: ${baul.id})\n\nMotivo:\n${reason}`;
    const result = await run(() => api.support.submit('BaulDeletion', message), {
      successMessage: 'Hemos recibido tu solicitud. Nuestro equipo de soporte se pondrá en contacto contigo.',
      errorMessage: 'No se pudo enviar la solicitud. Inténtalo de nuevo.',
    });
    if (result.ok) {
      posthog.capture('baul_deletion_requested');
      navigate(`/baules/${baul.id}`);
    }
  };

  return (
    <RequestBaulDeletionScreen
      baulName={baul.name}
      onBack={() => navigate(`/baules/${baul.id}`)}
      onSubmit={handleSubmit}
      isSubmitting={isPending()}
    />
  );
};
