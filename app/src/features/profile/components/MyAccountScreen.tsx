import { Bell, LogOut, Loader2, User } from 'lucide-react';
import { ActionListItem } from '@/design-system/components/data-display/ActionListItem';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { PageHeader } from '@/design-system/layouts/PageHeader';

interface MyAccountScreenProps {
  onBack: () => void;
  onNavigateToProfile: () => void;
  onNavigateToNotifications: () => void;
  onSignOut: () => void;
  isSigningOut?: boolean;
}

export function MyAccountScreen({
  onBack,
  onNavigateToProfile,
  onNavigateToNotifications,
  onSignOut,
  isSigningOut = false,
}: MyAccountScreenProps) {
  return (
    <div className="min-h-screen bg-background">
      <PageHeader variant="inline" onBack={onBack} backDisabled={isSigningOut} title="Mi cuenta" />

      <PageContainer className="py-6">
        <div className="space-y-2">
          <ActionListItem
            onClick={onNavigateToProfile}
            icon={<User className="w-5 h-5" />}
            title="Mi perfil"
            description="Información de tu cuenta"
          />

          <ActionListItem
            onClick={onNavigateToNotifications}
            icon={<Bell className="w-5 h-5" />}
            title="Notificaciones"
            description="Resumen semanal por email"
          />
        </div>

        <div className="mt-8 pt-6 border-t border-border">
          <ActionListItem
            onClick={onSignOut}
            disabled={isSigningOut}
            variant="destructive"
            icon={isSigningOut ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
            title={isSigningOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
          />
        </div>
      </PageContainer>
    </div>
  );
}
