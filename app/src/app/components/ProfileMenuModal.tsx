import React from 'react';
import { X, User, CreditCard, LogOut, Loader2, HelpCircle } from 'lucide-react';

interface ProfileMenuModalProps {
  onClose: () => void;
  onNavigateToProfile: () => void;
  onNavigateToSubscription: () => void;
  onNavigateToHelp: () => void;
  onSignOut: () => void;
  userEmail?: string;
  monetizationEnabled?: boolean;
  isSigningOut?: boolean;
}

export function ProfileMenuModal({
  onClose,
  onNavigateToProfile,
  onNavigateToSubscription,
  onNavigateToHelp,
  onSignOut,
  userEmail,
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
            <button
              onClick={onClose}
              disabled={isSigningOut}
              className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Desktop header */}
        <div className="hidden md:flex items-center justify-between p-6 border-b border-border">
          <h2 className="font-serif text-xl text-foreground">Cuenta</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* User info */}
        {userEmail && (
          <div className="px-6 py-4 border-b border-border">
            <p className="text-sm text-muted-foreground">{userEmail}</p>
          </div>
        )}

        {/* Menu items */}
        <div className="p-4">
          <button
            onClick={onNavigateToProfile}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-xl hover:bg-muted transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="font-medium text-foreground">Mi perfil</div>
              <div className="text-sm text-muted-foreground">Información de tu cuenta</div>
            </div>
          </button>

          {monetizationEnabled && (
            <button
              onClick={onNavigateToSubscription}
              className="w-full flex items-center gap-4 px-4 py-4 rounded-xl hover:bg-muted transition-colors text-left mt-2"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="font-medium text-foreground">Mi suscripción</div>
                <div className="text-sm text-muted-foreground">Plan y espacio disponible</div>
              </div>
            </button>
          )}

          <button
            onClick={onNavigateToHelp}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-xl hover:bg-muted transition-colors text-left mt-2"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <HelpCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="font-medium text-foreground">Ayuda y soporte</div>
              <div className="text-sm text-muted-foreground">Preguntas, problemas y sugerencias</div>
            </div>
          </button>
        </div>

        {/* Sign out */}
        <div className="p-4 border-t border-border">
          <button
            onClick={onSignOut}
            disabled={isSigningOut}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-xl hover:bg-destructive/10 transition-colors text-left disabled:opacity-50"
          >
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
              {isSigningOut ? (
                <Loader2 className="w-5 h-5 text-destructive animate-spin" />
              ) : (
                <LogOut className="w-5 h-5 text-destructive" />
              )}
            </div>
            <div className="font-medium text-destructive">
              {isSigningOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
            </div>
          </button>
        </div>

        {/* Bottom padding for mobile */}
        <div className="h-8 md:hidden" />
      </div>
    </div>
  );
}
