import { Bell, ImageIcon, Pencil, Trash2 } from 'lucide-react';
import { ActionListItem } from '@/design-system/components/data-display/ActionListItem';
import { CounterBadge } from '@/design-system/components/data-display/Badges';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { PageHeader } from '@/design-system/layouts/PageHeader';

interface BaulSettingsScreenProps {
  onBack: () => void;
  canSetCover: boolean;
  canEditInfo: boolean;
  canReviewRemovalRequests: boolean;
  canRequestBaulDeletion: boolean;
  pendingRemovalRequestsCount: number;
  onPickCover: () => void;
  onEditInfo: () => void;
  onReviewRemovalRequests: () => void;
  onDeleteBaul: () => void;
}

export function BaulSettingsScreen({
  onBack,
  canSetCover,
  canEditInfo,
  canReviewRemovalRequests,
  canRequestBaulDeletion,
  pendingRemovalRequestsCount,
  onPickCover,
  onEditInfo,
  onReviewRemovalRequests,
  onDeleteBaul,
}: BaulSettingsScreenProps) {
  const hasManagementSection = canSetCover || canEditInfo || canReviewRemovalRequests;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        variant="inline"
        onBack={onBack}
        title="Ajustes del baúl"
      />

      <PageContainer className="py-6">
        {hasManagementSection && (
          <div className="space-y-2">
            {canSetCover && (
              <ActionListItem
                onClick={onPickCover}
                icon={<ImageIcon className="w-5 h-5" />}
                title="Elegir foto de portada"
              />
            )}

            {canEditInfo && (
              <ActionListItem
                onClick={onEditInfo}
                icon={<Pencil className="w-5 h-5" />}
                title="Editar información del baúl"
              />
            )}

            {canReviewRemovalRequests && (
              <ActionListItem
                onClick={onReviewRemovalRequests}
                icon={<Bell className="w-5 h-5" />}
                title="Solicitudes de eliminación"
                trailing={<CounterBadge count={pendingRemovalRequestsCount} />}
              />
            )}
          </div>
        )}

        {canRequestBaulDeletion && (
          <div className={hasManagementSection ? 'mt-8 pt-6 border-t border-border' : undefined}>
            <h2 className="text-sm font-medium text-destructive mb-2 px-4">Zona de peligro</h2>
            <ActionListItem
              onClick={onDeleteBaul}
              variant="destructive"
              icon={<Trash2 className="w-5 h-5" />}
              title="Eliminar baúl"
            />
          </div>
        )}
      </PageContainer>
    </div>
  );
}
