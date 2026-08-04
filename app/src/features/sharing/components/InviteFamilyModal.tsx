import React, { useEffect, useState } from 'react';
import { Copy, Share2, RefreshCw } from 'lucide-react';
import { Button } from '@/design-system/components/actions/Button';
import { Notice } from '@/design-system/components/feedback/Notice';
import { ModalActions } from '@/design-system/components/overlays/ModalActions';
import { BottomSheetModal } from '@/design-system/components/overlays/BottomSheetModal';
import type { ToastVariant } from '@/design-system/components/feedback/Toast';
import { sharePublicLink } from '@/features/sharing/sharePublicLink';
import { BaulInviteLink } from '@/types';

interface InviteFamilyModalProps {
  baulName: string;
  fetchLink: () => Promise<BaulInviteLink>;
  onRegenerate: () => Promise<BaulInviteLink>;
  onCancel: () => void;
  onToast: (message: string, variant?: ToastVariant) => void;
}

export function InviteFamilyModal({ baulName, fetchLink, onRegenerate, onCancel, onToast }: InviteFamilyModalProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [confirmingRegenerate, setConfirmingRegenerate] = useState(false);

  useEffect(() => {
    fetchLink()
      .then((link) => setUrl(link.url))
      .catch(() => onToast('Error al cargar el enlace de invitación', 'error'))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCopy = () => {
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      onToast('Enlace copiado al portapapeles');
    }).catch(() => onToast('Error al copiar el enlace', 'error'));
  };

  const handleShare = () => {
    if (!url) return;
    sharePublicLink({
      title: `Invitación a ${baulName}`,
      text: `Te invito a unirte a mi baúl de recuerdos "${baulName}" en El Baúl.`,
      url,
      onCopied: () => onToast('Enlace copiado al portapapeles'),
    });
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const link = await onRegenerate();
      setUrl(link.url);
      onToast('Enlace regenerado');
      setConfirmingRegenerate(false);
    } catch {
      onToast('Error al regenerar el enlace', 'error');
    } finally {
      setIsRegenerating(false);
    }
  };

  if (confirmingRegenerate) {
    return (
      <BottomSheetModal onCancel={() => setConfirmingRegenerate(false)} desktopCentered backdropOpacity={60}>
        <h2 className="font-serif text-xl text-foreground mb-1">¿Regenerar el enlace?</h2>

        <Notice variant="destructive" size="sm" className="mb-5 mt-3">
          El enlace actual dejará de funcionar inmediatamente. Cualquiera que lo tenga guardado o compartido ya no podrá usarlo para unirse.
        </Notice>

        <ModalActions className="pt-0">
          <Button variant="secondary" onClick={() => setConfirmingRegenerate(false)} disabled={isRegenerating}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleRegenerate} disabled={isRegenerating} isLoading={isRegenerating}>
            Regenerar enlace
          </Button>
        </ModalActions>
      </BottomSheetModal>
    );
  }

  return (
    <BottomSheetModal onCancel={onCancel}>
      <h2 className="text-xl font-serif text-foreground mb-1">Invita a tu familia</h2>
      <p className="text-sm text-muted-foreground mb-4">Este enlace permite unirse a este baúl.</p>

      <div className="bg-muted/50 rounded-xl p-3 text-sm text-foreground break-all mb-4 min-h-11 flex items-center">
        {isLoading ? 'Cargando enlace...' : url}
      </div>

      <div className="space-y-2">
        <Button variant="primary" fullWidth leftIcon={<Share2 className="w-4 h-4" />} onClick={handleShare} disabled={!url}>
          Compartir
        </Button>
        <Button variant="secondary" fullWidth leftIcon={<Copy className="w-4 h-4" />} onClick={handleCopy} disabled={!url}>
          Copiar
        </Button>
        <Button variant="ghost" fullWidth leftIcon={<RefreshCw className="w-4 h-4" />} onClick={() => setConfirmingRegenerate(true)} disabled={!url}>
          Regenerar enlace
        </Button>
      </div>

      <Button variant="plain" fullWidth onClick={onCancel} className="mt-6 text-sm text-muted-foreground text-center py-2">
        Cerrar
      </Button>
    </BottomSheetModal>
  );
}
