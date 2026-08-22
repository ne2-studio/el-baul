import { useEffect } from 'react';
import { Check } from 'lucide-react';
import { usePushNotificationsStore } from '@/store/usePushNotificationsStore';
import { DataTable } from '@/app/components/DataTable';
import { AsyncState } from '@/app/components/AsyncState';
import { formatDate } from '@/utils/format';
import { PUSH_TYPE_LABELS, PUSH_STATUS_LABELS } from '@/utils/pushLabels';
import type { AdminSentPushNotification } from '@/types';

export function PushListRoute() {
  const { pushNotifications, isLoading, error, fetchPushNotifications } = usePushNotificationsStore();

  useEffect(() => {
    fetchPushNotifications();
  }, []);

  return (
    <AsyncState isLoading={isLoading} error={error} hasData={pushNotifications.length > 0} renderWhenEmpty>
      <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
        <DataTable<AdminSentPushNotification>
          rows={pushNotifications}
          keyFor={(n) => n.id}
          emptyMessage="Todavía no se ha enviado ninguna notificación push."
          columns={[
            { header: 'Fecha', render: (n) => formatDate(n.sentAt ?? n.createdAt) },
            { header: 'Tipo', render: (n) => PUSH_TYPE_LABELS[n.type] ?? n.type },
            { header: 'Título', render: (n) => n.title },
            { header: 'Estado', render: (n) => PUSH_STATUS_LABELS[n.status] ?? n.status },
            {
              header: 'Abierto',
              render: (n) => (n.firstOpenedAt ? <Check className="w-4 h-4 text-primary" /> : null),
            },
          ]}
        />
      </div>
    </AsyncState>
  );
}
