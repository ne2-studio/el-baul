import React, { useState } from 'react';
import { ChevronLeft, MoreVertical, Share2, UserX } from 'lucide-react';
import { Persona, BaulRole } from '@/types';
import { getRoleDisplayName } from '@/utils/roleUtils';
import { RevokeAccessModal } from './RevokeAccessModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface PersonaDetailScreenProps {
  persona: Persona;
  isAdmin: boolean;
  onBack: () => void;
  onEdit: () => void;
  onShareInvite: () => void;
  onChangeRole: (role: BaulRole) => void;
  /** Devuelve si la revocación tuvo éxito — el modal se queda abierto (con spinner)
   * hasta saberlo, y solo se cierra por sí solo si el resultado fue true. */
  onRevokeAccess: () => Promise<boolean>;
}

export function PersonaDetailScreen({
  persona,
  isAdmin,
  onBack,
  onEdit,
  onShareInvite,
  onChangeRole,
  onRevokeAccess,
}: PersonaDetailScreenProps) {
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const displayName = persona.name || persona.nickname;
  const isPending = persona.status === 'pending';
  const canManage = isAdmin && persona.role !== 'custodio';

  const handleConfirmRevoke = async () => {
    setIsRevoking(true);
    const ok = await onRevokeAccess();
    setIsRevoking(false);
    if (ok) setShowRevokeModal(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 bg-background/80 backdrop-blur-sm border-b border-border z-10">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Volver</span>
            </button>

            {canManage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-secondary"
                    aria-label="Opciones de la persona"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {isPending && (
                    <DropdownMenuItem onClick={onShareInvite}>
                      <Share2 className="w-4 h-4 mr-2" />
                      Compartir invitación
                    </DropdownMenuItem>
                  )}

                  {isPending && <DropdownMenuSeparator />}

                  <DropdownMenuItem variant="destructive" onClick={() => setShowRevokeModal(true)}>
                    <UserX className="w-4 h-4 mr-2" />
                    Quitar acceso
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden" style={{ height: '210px' }}>
        {persona.avatarUrl ? (
          <img src={persona.avatarUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/60 via-primary/30 to-foreground/50" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 pb-5">
          <div className="max-w-2xl mx-auto px-6">
            <h1 className="text-3xl font-serif text-white leading-tight" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.35)' }}>
              {displayName}
            </h1>
            {persona.name && (
              <p className="text-sm text-white/80 mt-1 italic">"{persona.nickname}"</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              {!isPending && (
                <span className="text-xs text-white font-medium px-2 py-1 rounded-full bg-white/20">
                  {getRoleDisplayName(persona.role)}
                </span>
              )}
              <span className="text-xs text-white/70">
                {isPending ? 'Todavía no se ha unido' : 'Ya pertenece al baúl'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <div className="bg-card rounded-2xl border border-border p-6">
          <p
            className="text-xs text-muted-foreground uppercase tracking-wide mb-4"
            style={{ fontSize: '0.68rem', letterSpacing: '0.1em' }}
          >
            Información
          </p>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Nombre</p>
              <p className="text-foreground">{persona.name || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Apodo</p>
              <p className="text-foreground">{persona.nickname}</p>
            </div>
          </div>

          {persona.canEdit && (
            <button
              onClick={onEdit}
              className="w-full mt-6 py-3 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Editar
            </button>
          )}
        </div>

        {canManage && !isPending && (
          <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
            <p
              className="text-xs text-muted-foreground uppercase tracking-wide"
              style={{ fontSize: '0.68rem', letterSpacing: '0.1em' }}
            >
              Gestión
            </p>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Rol</label>
              <select
                value={persona.role}
                onChange={(e) => onChangeRole(e.target.value as BaulRole)}
                className="w-full text-sm px-3 py-2.5 border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="colaborador">Colaborador</option>
                <option value="administrador">Administrador</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {showRevokeModal && (
        <RevokeAccessModal
          userName={displayName}
          isSubmitting={isRevoking}
          onConfirm={handleConfirmRevoke}
          onCancel={() => setShowRevokeModal(false)}
        />
      )}
    </div>
  );
}
