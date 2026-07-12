import React from 'react';
import { ArrowLeft, UserPlus, Check, X } from 'lucide-react';
import { Baul } from './BaulesList';
import { AccessRequest } from '@/types';

interface AccessRequestsScreenProps {
  baul: Baul;
  requests: AccessRequest[];
  onBack: () => void;
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
}

export function AccessRequestsScreen({ 
  baul, 
  requests, 
  onBack, 
  onApprove,
  onReject 
}: AccessRequestsScreenProps) {
  const pendingRequests = requests.filter(r => r.status === 'pending');

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
        <h1 className="text-lg font-serif text-gray-900">Peticiones de acceso</h1>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-6">
        {/* Baul info */}
        <div className="mb-6">
          <h2 className="font-serif text-xl text-gray-900 mb-1">{baul.name}</h2>
        </div>

        {pendingRequests.length > 0 ? (
          <div className="space-y-4">
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm"
              >
                {/* User info */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-10 h-10 rounded-full bg-cream flex items-center justify-center">
                      <UserPlus className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {request.name || request.email}
                      </p>
                      {request.name && (
                        <p className="text-sm text-gray-500 truncate">{request.email}</p>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 ml-12">
                    Solicitó acceso {request.requestDate}
                  </p>
                </div>

                {/* Optional message */}
                {request.message && (
                  <div className="mb-4 ml-12">
                    <div className="bg-cream/30 rounded-lg p-3">
                      <p className="text-sm text-gray-700 leading-relaxed italic">
                        "{request.message}"
                      </p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 ml-12">
                  <button
                    onClick={() => onApprove(request.id)}
                    className="flex-1 bg-primary hover:bg-primary-dark text-white py-2.5 px-4 rounded-full font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Aceptar
                  </button>
                  <button
                    onClick={() => onReject(request.id)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 px-4 rounded-full font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-cream/50 flex items-center justify-center mb-4">
              <UserPlus className="w-8 h-8 text-primary/40" />
            </div>
            <p className="text-gray-600 leading-relaxed">
              No tienes peticiones pendientes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
