import React, { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Button } from './Button';

export interface RemovalRequest {
  id: string;
  photoId: string;
  photoUrl: string;
  photoCaption?: string;
  requesterName: string;
  requesterEmail: string;
  reason: string;
  requestDate: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface RemovalRequestsListProps {
  requests: RemovalRequest[];
  onBack: () => void;
  /** Devuelven si la operación tuvo éxito — la tarjeta solo desaparece de la lista
   * cuando el store la quita tras confirmarse en el servidor (ver useAppStore.removePhoto/keepPhoto). */
  onRemovePhoto: (requestId: string, photoId: string) => Promise<boolean>;
  onKeepPhoto: (requestId: string) => Promise<boolean>;
}

export function RemovalRequestsList({
  requests,
  onBack,
  onRemovePhoto,
  onKeepPhoto,
}: RemovalRequestsListProps) {
  const [busy, setBusy] = useState<{ requestId: string; action: 'remove' | 'keep' } | null>(null);

  const pendingRequests = requests.filter(r => r.status === 'pending');

  const handleRemovePhoto = async (request: RemovalRequest) => {
    setBusy({ requestId: request.id, action: 'remove' });
    await onRemovePhoto(request.id, request.photoId);
    setBusy(null);
  };

  const handleKeepPhoto = async (request: RemovalRequest) => {
    setBusy({ requestId: request.id, action: 'keep' });
    await onKeepPhoto(request.id);
    setBusy(null);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-background border-b border-border sticky top-0 z-10">
        <div className="flex items-center gap-4 p-4">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </button>
          <div>
            <h1 className="font-serif text-xl text-foreground">
              Solicitudes de retirada
            </h1>
            {pendingRequests.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {pendingRequests.length} {pendingRequests.length === 1 ? 'solicitud pendiente' : 'solicitudes pendientes'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {pendingRequests.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground font-serif text-lg italic">
              No hay solicitudes pendientes.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map(request => {
              const isBusy = busy?.requestId === request.id;
              return (
                <div
                  key={request.id}
                  className="bg-card border border-border rounded-2xl overflow-hidden"
                >
                  {/* Photo */}
                  <div className="aspect-[4/3] bg-muted">
                    <img
                      src={request.photoUrl}
                      alt={request.photoCaption || 'Foto'}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Request details */}
                  <div className="p-4">
                    {/* Requester info */}
                    <div className="mb-3">
                      <p className="text-sm font-medium text-foreground">
                        {request.requesterName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {request.requestDate}
                      </p>
                    </div>

                    {/* Reason */}
                    <div className="mb-4 p-3 bg-muted/30 rounded-lg border border-border/50">
                      <p className="text-sm text-foreground/80 leading-relaxed">
                        "{request.reason}"
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col md:flex-row gap-3">
                      <Button
                        variant="secondary"
                        fullWidth
                        onClick={() => handleKeepPhoto(request)}
                        disabled={isBusy}
                        isLoading={isBusy && busy?.action === 'keep'}
                      >
                        Mantener foto
                      </Button>
                      <Button
                        variant="primary"
                        fullWidth
                        onClick={() => handleRemovePhoto(request)}
                        disabled={isBusy}
                        isLoading={isBusy && busy?.action === 'remove'}
                        className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                      >
                        Retirar foto
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
