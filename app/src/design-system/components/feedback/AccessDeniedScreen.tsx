import { LockKeyhole } from 'lucide-react';
import { Button } from '@/design-system/components/actions/Button';
import { EmptyState } from '@/design-system/components/feedback/EmptyState';

interface AccessDeniedScreenProps {
  onBackToBaules: () => void;
}

export function AccessDeniedScreen({ onBackToBaules }: AccessDeniedScreenProps) {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <EmptyState
          icon={<LockKeyhole className="w-12 h-12" />}
          title="No tienes acceso a este contenido"
          subtitle="Puede que el baúl, la foto o la invitación ya no estén disponibles para tu cuenta."
        />
        <div className="mt-2 flex justify-center">
          <Button onClick={onBackToBaules}>Volver a mis baúles</Button>
        </div>
      </div>
    </main>
  );
}
