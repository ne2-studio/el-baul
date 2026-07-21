import { useEffect } from 'react';
import { useEmailsStore } from '@/store/useEmailsStore';
import { DataTable } from '@/app/components/DataTable';
import { formatDate } from '@/utils/format';
import type { AdminSentEmail } from '@/types';

const TYPE_LABELS: Record<string, string> = {
  Welcome: 'Bienvenida',
  TestWelcome: 'Bienvenida (prueba)',
  WeeklyDigest: 'Resumen semanal',
  TestWeeklyDigest: 'Resumen semanal (prueba)',
};

const STATUS_LABELS: Record<string, string> = {
  Pending: 'Pendiente',
  Sending: 'Enviando',
  Sent: 'Enviado',
  Delivered: 'Entregado',
  Failed: 'Fallido',
  Bounced: 'Rebotado',
  Complained: 'Queja',
};

export function EmailsListRoute() {
  const { emails, isLoading, error, fetchEmails } = useEmailsStore();

  useEffect(() => {
    fetchEmails();
  }, []);

  return (
    <div className="space-y-6">
      <h2>Emails</h2>
      {isLoading && emails.length === 0 && <p className="text-muted-foreground">Cargando…</p>}
      {error && <p className="text-destructive">{error}</p>}
      {!isLoading || emails.length > 0 ? (
        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <DataTable<AdminSentEmail>
            rows={emails}
            keyFor={(e) => e.id}
            emptyMessage="Todavía no se ha enviado ningún email."
            columns={[
              { header: 'Fecha', render: (e) => formatDate(e.sentAt ?? e.createdAt) },
              { header: 'Destinatario', render: (e) => e.recipientEmail },
              { header: 'Tipo', render: (e) => TYPE_LABELS[e.type] ?? e.type },
              { header: 'Asunto', render: (e) => e.subject },
              { header: 'Estado', render: (e) => STATUS_LABELS[e.status] ?? e.status },
            ]}
          />
        </div>
      ) : null}
    </div>
  );
}
