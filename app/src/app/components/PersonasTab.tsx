import React, { useState } from 'react';
import { UserX, Crown, User as UserIcon, Share2 } from 'lucide-react';
import { getRoleDisplayName } from '@/utils/roleUtils';
import { SharedUser, BaulRole } from '@/types';
import { RevokeAccessModal } from './RevokeAccessModal';
import { EmptyState } from './EmptyState';

interface PersonasTabProps {
  sharedUsers: SharedUser[];
  isAdmin: boolean;
  currentUserEmail?: string;
  onShareInvite: (persona: SharedUser) => void;
  onChangeRole: (sharedUserId: string, role: BaulRole) => void;
  onRevokeAccess: (sharedUserId: string) => void;
}

export function PersonasTab({
  sharedUsers,
  isAdmin,
  currentUserEmail,
  onShareInvite,
  onChangeRole,
  onRevokeAccess,
}: PersonasTabProps) {
  const [personaToRevoke, setPersonaToRevoke] = useState<SharedUser | null>(null);

  const isMe = (persona: SharedUser) => !!currentUserEmail && persona.email === currentUserEmail;

  if (sharedUsers.length === 0) {
    return (
      <EmptyState
        icon={<UserIcon className="w-20 h-20" strokeWidth={1.5} />}
        title="Todavía no hay personas"
        subtitle="Añade a los miembros de tu familia para poder invitarles al baúl"
      />
    );
  }

  return (
    <div className="space-y-3">
      {sharedUsers.map((persona) => (
        <div
          key={persona.id}
          className={`bg-card rounded-xl p-4 border ${isMe(persona) ? 'border-primary/30' : 'border-border'}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                {persona.role === 'custodio' ? (
                  <Crown className="w-5 h-5 text-primary" />
                ) : (
                  <UserIcon className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">
                  {isMe(persona) ? 'Tú' : persona.nickname}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {persona.status === 'active' ? 'En el baúl' : 'Aún no se ha unido'}
                </p>
              </div>
            </div>

            {isAdmin && persona.role !== 'custodio' ? (
              <select
                value={persona.role}
                onChange={(e) => onChangeRole(persona.id, e.target.value as BaulRole)}
                className="text-xs px-2 py-1.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 shrink-0"
              >
                <option value="colaborador">Colaborador</option>
                <option value="administrador">Administrador</option>
              </select>
            ) : (
              <span className="text-xs text-muted-foreground font-medium px-2 py-1.5 rounded-full bg-secondary shrink-0">
                {getRoleDisplayName(persona.role)}
              </span>
            )}
          </div>

          {isAdmin && (persona.status === 'pending' || persona.role !== 'custodio') && (
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/60">
              {persona.status === 'pending' && (
                <button
                  onClick={() => onShareInvite(persona)}
                  className="text-sm text-primary font-medium hover:underline flex items-center gap-1.5"
                >
                  <Share2 className="w-4 h-4" />
                  Compartir invitación
                </button>
              )}
              {persona.role !== 'custodio' && (
                <button
                  onClick={() => setPersonaToRevoke(persona)}
                  className="text-sm text-destructive hover:opacity-80 font-medium flex items-center gap-1.5"
                >
                  <UserX className="w-4 h-4" />
                  Quitar acceso
                </button>
              )}
            </div>
          )}
        </div>
      ))}

      {personaToRevoke && (
        <RevokeAccessModal
          userName={personaToRevoke.nickname}
          onConfirm={() => {
            onRevokeAccess(personaToRevoke.id);
            setPersonaToRevoke(null);
          }}
          onCancel={() => setPersonaToRevoke(null)}
        />
      )}
    </div>
  );
}
