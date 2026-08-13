import React, { useEffect, useState } from 'react';
import { Tv } from 'lucide-react';
import { Button } from '@/design-system/components/actions/Button';
import { BottomSheetModal } from '@/design-system/components/overlays/BottomSheetModal';
import type { ToastVariant } from '@/design-system/components/feedback/Toast';
import { TvSession } from '@/types';

interface TvSessionModalProps {
  onCreate: () => Promise<TvSession>;
  onCancelSession: (token: string) => Promise<void>;
  onClose: () => void;
  onToast: (message: string, variant?: ToastVariant) => void;
}

// "Ver en TV" bottom sheet — mirrors InviteFamilyModal's shape (fetch-on-mount, link box,
// primary/secondary actions), but the link is a brand-new temporary session created on open
// (not a stable, reusable one), and "Cancelar" actually revokes it rather than just dismissing
// the sheet. See docs PRD "Modo TV" and /tmp/modo-tv's mockup for the "Ya está abierto en la
// TV" / "Cancelar" pair this reproduces.
export function TvSessionModal({ onCreate, onCancelSession, onClose, onToast }: TvSessionModalProps) {
  const [session, setSession] = useState<TvSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    onCreate()
      .then(setSession)
      .catch(() => onToast('Error al iniciar el acceso a la TV', 'error'))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCancel = async () => {
    if (!session) {
      onClose();
      return;
    }
    setIsCancelling(true);
    try {
      await onCancelSession(session.token);
    } catch {
      onToast('Error al cancelar el acceso a la TV', 'error');
    } finally {
      setIsCancelling(false);
      onClose();
    }
  };

  const linkLabel = session ? session.url.replace(/^https?:\/\//, '') : null;

  return (
    <BottomSheetModal onCancel={handleCancel}>
      <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-3.5">
        <Tv className="w-6 h-6 text-primary" />
      </div>
      <h2 className="font-serif text-xl text-foreground mb-1.5">Ver en TV</h2>
      <p className="text-sm text-muted-foreground mb-4.5">
        Abre esta dirección en el navegador de tu televisión. El acceso es solo de lectura y caduca solo.
      </p>

      <div className="bg-secondary rounded-xl py-3.5 px-4 text-center mb-4.5 min-h-11 flex items-center justify-center">
        <span className="font-serif text-lg text-foreground break-all">
          {isLoading ? 'Cargando enlace...' : linkLabel}
        </span>
      </div>

      <div className="space-y-2">
        <Button variant="primary" fullWidth onClick={onClose} disabled={!session}>
          Ya está abierto en la TV
        </Button>
        <Button variant="ghost" fullWidth onClick={handleCancel} disabled={isCancelling} isLoading={isCancelling}>
          Cancelar
        </Button>
      </div>
    </BottomSheetModal>
  );
}
