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
  onRemovePhoto: (requestId: string, photoId: string) => void;
  onKeepPhoto: (requestId: string) => void;
}

export function RemovalRequestsList({ 
  requests, 
  onBack, 
  onRemovePhoto, 
  onKeepPhoto 
}: RemovalRequestsListProps) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  
  const pendingRequests = requests.filter(r => r.status === 'pending');
  
  const handleRemovePhoto = (request: RemovalRequest) => {
    onRemovePhoto(request.id, request.photoId);
    setFeedbackMessage('La solicitud ha sido resuelta.');
    setShowFeedback(true);
    setTimeout(() => setShowFeedback(false), 3000);
  };
  
  const handleKeepPhoto = (request: RemovalRequest) => {
    onKeepPhoto(request.id);
    setFeedbackMessage('La solicitud ha sido resuelta.');
    setShowFeedback(true);
    setTimeout(() => setShowFeedback(false), 3000);
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
            {pendingRequests.map(request => (
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
                    >
                      Mantener foto
                    </Button>
                    <Button
                      variant="primary"
                      fullWidth
                      onClick={() => handleRemovePhoto(request)}
                      className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                    >
                      Retirar foto
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Feedback toast */}
      {showFeedback && (
        <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-down">
          <div className="bg-background border border-border rounded-lg shadow-lg p-4">
            <p className="text-foreground text-sm">
              {feedbackMessage}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}