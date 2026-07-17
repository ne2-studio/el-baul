import React from 'react';
import { ChevronLeft, Inbox } from 'lucide-react';
import { EmptyState } from './EmptyState';

export interface ActivityItem {
  id: string;
  type: 'photo-removal-request' | 'new-photos' | 'access-granted' | 'invitation' | 'role-changed';
  baulId: string;
  baulName: string;
  timestamp: string | Date;
  isActionable: boolean;
  isRead?: boolean;
  // Type-specific data
  requesterEmail?: string;
  photoCount?: number;
  oldRole?: string;
  newRole?: string;
  removalRequestId?: string;
}

interface ActivityCenterProps {
  activities: ActivityItem[];
  onBack: () => void;
  onViewBaul?: (baulId: string) => void;
  onReviewRemovalRequest?: (baulId: string, requestId: string) => void;
}

export function ActivityCenter({
  activities,
  onBack,
  onViewBaul,
  onReviewRemovalRequest,
}: ActivityCenterProps) {
  // Sort activities: actionable first, then by timestamp
  const sortedActivities = [...activities].sort((a, b) => {
    if (a.isActionable && !b.isActionable) return -1;
    if (!a.isActionable && b.isActionable) return 1;
    
    const dateA = new Date(a.timestamp);
    const dateB = new Date(b.timestamp);
    return dateB.getTime() - dateA.getTime();
  });

  const getRelativeTime = (timestamp: string | Date): string => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffHours < 6) return 'Hace poco';
    if (diffHours < 24) return 'Hoy';
    if (diffDays < 2) return 'Ayer';
    if (diffDays < 7) return `Hace ${Math.floor(diffDays)} días`;
    return 'Hace más de una semana';
  };

  const renderActivityCard = (activity: ActivityItem) => {
    let title = '';
    let cta = '';
    let onCtaClick: (() => void) | undefined;

    switch (activity.type) {
      case 'photo-removal-request':
        title = `Alguien ha solicitado retirar una foto de tu baúl «${activity.baulName}».`;
        cta = 'Revisar solicitud';
        onCtaClick = activity.removalRequestId && onReviewRemovalRequest
          ? () => onReviewRemovalRequest(activity.baulId, activity.removalRequestId!)
          : undefined;
        break;

      case 'new-photos':
        title = `Se han añadido nuevas fotos al baúl «${activity.baulName}».`;
        cta = 'Ver baúl';
        onCtaClick = onViewBaul ? () => onViewBaul(activity.baulId) : undefined;
        break;

      case 'access-granted':
        title = `Ya tienes acceso al baúl «${activity.baulName}».`;
        cta = 'Ver baúl';
        onCtaClick = onViewBaul ? () => onViewBaul(activity.baulId) : undefined;
        break;

      case 'invitation':
        title = `Te han dado acceso al baúl «${activity.baulName}».`;
        cta = 'Ver baúl';
        onCtaClick = onViewBaul ? () => onViewBaul(activity.baulId) : undefined;
        break;

      case 'role-changed':
        title = `Tu nivel de acceso al baúl «${activity.baulName}» ha cambiado.`;
        cta = 'Ver baúl';
        onCtaClick = onViewBaul ? () => onViewBaul(activity.baulId) : undefined;
        break;
    }

    return (
      <div
        key={activity.id}
        className={`border border-border rounded-2xl p-4 ${
          activity.isActionable ? 'bg-secondary/30' : 'bg-background'
        }`}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <p className="text-sm text-foreground flex-1">{title}</p>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {getRelativeTime(activity.timestamp)}
          </span>
        </div>

        {cta && onCtaClick && (
          <button
            onClick={onCtaClick}
            className={`text-sm px-4 py-2 rounded-full transition-colors ${
              activity.isActionable
                ? 'bg-primary text-white hover:bg-primary/90'
                : 'bg-secondary text-foreground hover:bg-secondary/80 border border-border'
            }`}
          >
            {cta}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-sm border-b border-border z-10">
        <div className="max-w-2xl mx-auto px-6 py-5">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm">Volver</span>
          </button>
          <h1 className="text-3xl text-foreground">Actividad</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Aquí puedes ver lo que ha pasado en tus baúles.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-6">
        {sortedActivities.length === 0 ? (
          <EmptyState
            icon={<Inbox className="w-20 h-20" strokeWidth={1.5} />}
            title="No ha pasado nada todavía"
            subtitle="Cuando ocurra algo relevante en tus baúles, lo verás aquí."
          />
        ) : (
          <div className="space-y-3">
            {sortedActivities.map(renderActivityCard)}
          </div>
        )}
      </div>
    </div>
  );
}
