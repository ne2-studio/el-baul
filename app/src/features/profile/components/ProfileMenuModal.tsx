import { X, User, CreditCard, LogOut, Loader2, HelpCircle, Bell } from 'lucide-react';
import { IconButton } from '@/design-system/components/actions/IconButton';
import { ActionListItem } from '@/design-system/components/data-display/ActionListItem';

interface ProfileMenuModalProps {
  onClose: () => void;
  onNavigateToProfile: () => void;
  onNavigateToSubscription: () => void;
  onNavigateToNotifications: () => void;
  onNavigateToHelp: () => void;
  onSignOut: () => void;
  monetizationEnabled?: boolean;
  isSigningOut?: boolean;
}

export function ProfileMenuModal({
  onClose,
  onNavigateToProfile,
  onNavigateToSubscription,
  onNavigateToNotifications,
  onNavigateToHelp,
  onSignOut,
  monetizationEnabled,
  isSigningOut = false,
}: ProfileMenuModalProps) {
  return (
    <div className="fixed inset-0 bg-foreground/40 z-50 flex items-end md:items-center md:justify-center">
      {/* Mobile: Bottom sheet, Desktop: Centered modal */}
      <div 
        className="bg-background w-full md:w-96 md:rounded-2xl rounded-t-3xl shadow-2xl animate-slide-up md:animate-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Mobile only */}
        <div className="md:hidden p-4 border-b border-border">
          <div className="w-12 h-1 bg-border rounded-full mx-auto mb-4" />
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl text-foreground">Cuenta</h2>
            <IconButton
              onClick={onClose}
              disabled={isSigningOut}
              size="sm"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </IconButton>
          </div>
        </div>

        {/* Desktop header */}
        <div className="hidden md:flex items-center justify-between p-6 border-b border-border">
          <h2 className="font-serif text-xl text-foreground">Cuenta</h2>
          <IconButton
            onClick={onClose}
            size="sm"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </IconButton>
        </div>

        {/* Menu items */}
        <div className="p-4">
          <ActionListItem
            onClick={onNavigateToProfile}
            icon={<User className="w-5 h-5" />}
            title="Mi perfil"
            description="Información de tu cuenta"
          />

          {monetizationEnabled && (
            <ActionListItem
              onClick={onNavigateToSubscription}
              className="mt-2"
              icon={<CreditCard className="w-5 h-5" />}
              title="Mi suscripción"
              description="Plan y espacio disponible"
            />
          )}

          <ActionListItem
            onClick={onNavigateToNotifications}
            className="mt-2"
            icon={<Bell className="w-5 h-5" />}
            title="Notificaciones"
            description="Resumen semanal por email"
          />

          <ActionListItem
            onClick={onNavigateToHelp}
            className="mt-2"
            icon={<HelpCircle className="w-5 h-5" />}
            title="Ayuda y soporte"
            description="Preguntas, problemas y sugerencias"
          />
        </div>

        {/* Sign out */}
        <div className="p-4 border-t border-border">
          <ActionListItem
            onClick={onSignOut}
            disabled={isSigningOut}
            variant="destructive"
            icon={isSigningOut ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
            title={isSigningOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
          />
        </div>

        {/* Bottom padding for mobile */}
        <div className="h-8 md:hidden" />
      </div>
    </div>
  );
}
