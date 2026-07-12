import React, { useState } from 'react';
import { ArrowLeft, UserCheck, UserX, Clock, Crown, ChevronDown } from 'lucide-react';
import { Baul } from './BaulesList';
import { getRoleDisplayName, getRoleDescription } from '@/utils/roleUtils';
import { SharedUser, BaulRole } from '@/types';
import { RevokeAccessModal } from './RevokeAccessModal';

interface PeopleWithAccessScreenProps {
  baul: Baul;
  sharedUsers: SharedUser[];
  onBack: () => void;
  onRevokeAccess: (userId: string) => void;
  onCancelInvitation: (userId: string) => void;
  onChangeRole: (userId: string, role: BaulRole) => void;
  currentUserEmail?: string;
  isCustodio?: boolean;
}

export function PeopleWithAccessScreen({ 
  baul, 
  sharedUsers, 
  onBack, 
  onRevokeAccess,
  onCancelInvitation,
  onChangeRole,
  currentUserEmail = 'usuario@ejemplo.com',
  isCustodio
}: PeopleWithAccessScreenProps) {
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [userToRevoke, setUserToRevoke] = useState<SharedUser | null>(null);
  
  const activeUsers = sharedUsers.filter(u => u.status === 'active' && u.role !== 'custodio');
  const pendingUsers = sharedUsers.filter(u => u.status === 'pending');
  const custodian = sharedUsers.find(u => u.role === 'custodio');
  const isMe = (user: SharedUser) => user.email === currentUserEmail;
  
  const handleRevokeClick = (user: SharedUser) => {
    setUserToRevoke(user);
  };
  
  const handleConfirmRevoke = () => {
    if (userToRevoke) {
      onRevokeAccess(userToRevoke.id);
      setUserToRevoke(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Volver"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-lg font-serif text-gray-900">Personas con acceso</h1>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-6">
        {/* Baul info */}
        <div className="mb-6">
          <h2 className="font-serif text-xl text-gray-900 mb-1">{baul.name}</h2>
          <p className="text-sm text-gray-600">
            Estas personas pueden ver el contenido de este baúl.
          </p>
        </div>

        {/* Pending invitations */}
        {pendingUsers.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Invitaciones pendientes
            </h3>
            <div className="space-y-3">
              {pendingUsers.map((user) => (
                <div
                  key={user.id}
                  className="bg-white rounded-xl p-4 border border-gray-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-gray-900 truncate">
                          {isMe(user) ? 'Tú' : (user.name || '(Desconocido)')}
                        </p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          Pendiente
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Invitado {user.invitedDate}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onCancelInvitation(user.id)}
                    className="mt-3 text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
                  >
                    Cancelar invitación
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active users - including custodian */}
        {(custodian || activeUsers.length > 0) ? (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Con acceso activo
            </h3>
            <div className="space-y-3">
              {/* Custodian */}
              {custodian && (
                <div className={`bg-white rounded-xl p-4 border ${isMe(custodian) ? 'border-primary/30' : 'border-gray-200'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Crown className="w-4 h-4 text-primary" />
                        <p className="font-medium text-gray-900">
                          {isMe(custodian) ? 'Tú' : (custodian.name || '(Desconocido)')}
                        </p>
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 mt-2">
                        <span className="text-xs text-primary font-medium">Custodio del baúl</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Other users */}
              {activeUsers.map((user) => (
                <div
                  key={user.id}
                  className={`bg-white rounded-xl p-4 border ${isMe(user) ? 'border-primary/30' : 'border-gray-200'}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {isMe(user) ? 'Tú' : (user.name || '(Desconocido)')}
                      </p>
                      
                      {/* Role display with dropdown */}
                      {isCustodio ? (
                        <div className="mt-2">
                          <label className="text-xs text-gray-500 block mb-1">Rol</label>
                          <select
                            value={user.role}
                            onChange={(e) => onChangeRole(user.id, e.target.value as BaulRole)}
                            className="text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          >
                            <option value="colaborador">Colaborador - Puede añadir fotos</option>
                            <option value="miembro">Miembro - Solo ver</option>
                          </select>
                        </div>
                      ) : (
                        <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-100">
                          <span className="text-xs text-gray-600 font-medium">{getRoleDisplayName(user.role)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions - only for custodian */}
                  {isCustodio && (
                    <button
                      onClick={() => handleRevokeClick(user)}
                      className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors flex items-center gap-1.5"
                    >
                      <UserX className="w-4 h-4" />
                      Quitar acceso
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : pendingUsers.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-cream/50 flex items-center justify-center mb-4">
              <UserCheck className="w-8 h-8 text-primary/40" />
            </div>
            <p className="text-gray-600 leading-relaxed">
              Todavía no has compartido este baúl con nadie.
            </p>
          </div>
        ) : null}
      </div>
      
      {/* Revoke Access Modal */}
      {userToRevoke && (
        <RevokeAccessModal
          userName={userToRevoke.name || '(Desconocido)'}
          onConfirm={handleConfirmRevoke}
          onCancel={() => setUserToRevoke(null)}
        />
      )}
    </div>
  );
}