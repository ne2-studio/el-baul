import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ExternalLink, ArrowLeft, Send, Check } from 'lucide-react';
import { useUsersStore } from '@/store/useUsersStore';
import { DataTable } from '@/app/components/DataTable';
import { formatDate } from '@/utils/format';
import { EMAIL_TYPE_LABELS, EMAIL_STATUS_LABELS } from '@/utils/emailLabels';
import { api } from '@/api';
import type { AdminSentEmail, AdminUserBaulMembership } from '@/types';
import { getEnv } from '@/runtimeConfig';

const APP_URL = getEnv('VITE_APP_URL') || 'http://localhost:3000';

export function UserDetailRoute() {
  const { userId } = useParams<{ userId: string }>();
  const { selectedUser, selectedUserEmails, isLoading, isLoadingEmails, error, fetchUser, fetchUserEmails } = useUsersStore();
  const navigate = useNavigate();

  type TestSendKey = 'welcome' | 'digest';
  const [sending, setSending] = useState<Record<TestSendKey, boolean>>({ welcome: false, digest: false });
  const [results, setResults] = useState<Record<TestSendKey, 'success' | 'error' | null>>({ welcome: null, digest: null });

  useEffect(() => {
    if (userId) {
      fetchUser(userId);
      fetchUserEmails(userId);
    }
  }, [userId]);

  const handleSendTest = async (key: TestSendKey, send: (userId: string) => Promise<void>) => {
    if (!userId) return;
    setSending((s) => ({ ...s, [key]: true }));
    setResults((r) => ({ ...r, [key]: null }));
    try {
      await send(userId);
      setResults((r) => ({ ...r, [key]: 'success' }));
      fetchUserEmails(userId); // refresh so the just-sent test email shows up below
    } catch {
      setResults((r) => ({ ...r, [key]: 'error' }));
    } finally {
      setSending((s) => ({ ...s, [key]: false }));
    }
  };

  if (isLoading && !selectedUser) return <p className="text-muted-foreground">Cargando…</p>;
  if (error) return <p className="text-destructive">{error}</p>;
  if (!selectedUser) return null;

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/usuarios')}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        Usuarios
      </button>

      <div className="flex items-start justify-between">
        <div>
          <h2>{selectedUser.name || selectedUser.email}</h2>
          <p className="text-muted-foreground text-sm mt-1">{selectedUser.email}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={() => handleSendTest('welcome', api.emails.sendWelcomeTest)}
              disabled={sending.welcome}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {sending.welcome ? 'Enviando…' : 'Enviar bienvenida de prueba'}
            </button>
            {results.welcome === 'success' && <p className="text-xs text-muted-foreground">Enviado a la dirección de prueba.</p>}
            {results.welcome === 'error' && <p className="text-xs text-destructive">No se pudo enviar.</p>}
          </div>
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={() => handleSendTest('digest', api.emails.sendDigestTest)}
              disabled={sending.digest}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {sending.digest ? 'Enviando…' : 'Enviar digest de prueba'}
            </button>
            {results.digest === 'success' && <p className="text-xs text-muted-foreground">Enviado a la dirección de prueba.</p>}
            {results.digest === 'error' && <p className="text-xs text-destructive">No se pudo enviar.</p>}
          </div>
          <a
            href={`https://auth.ne2.studio/users/${selectedUser.id}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm shrink-0"
          >
            Abrir en Zitadel
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-md">
        <div className="bg-card rounded-2xl p-4 border border-border">
          <p className="text-xs text-muted-foreground mb-1">Fecha de registro</p>
          <p className="text-sm">{formatDate(selectedUser.createdAt)}</p>
        </div>
        <div className="bg-card rounded-2xl p-4 border border-border">
          <p className="text-xs text-muted-foreground mb-1">Último acceso</p>
          <p className="text-sm">{formatDate(selectedUser.lastAccessAt)}</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
        <h3 className="mb-4">Baúles</h3>
        <DataTable<AdminUserBaulMembership>
          rows={selectedUser.baules}
          keyFor={(b) => b.personId}
          emptyMessage="Este usuario no participa en ningún baúl."
          columns={[
            {
              header: 'Nombre',
              render: (b) => (
                <button onClick={() => navigate(`/baules/${b.baulId}`)} className="text-primary hover:underline">
                  {b.baulName}
                </button>
              ),
            },
            { header: 'Rol', render: (b) => b.role },
            { header: 'Persona asociada', render: (b) => <span className="font-mono text-xs">{b.personId}</span> },
            {
              header: '',
              render: (b) => (
                <a
                  href={`${APP_URL}/baules/${b.baulId}/personas/${b.personId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  Ficha
                  <ExternalLink className="w-3 h-3" />
                </a>
              ),
            },
          ]}
        />
      </div>

      <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
        <h3 className="mb-4">Emails enviados</h3>
        {isLoadingEmails && selectedUserEmails.length === 0 ? (
          <p className="text-muted-foreground text-sm">Cargando…</p>
        ) : (
          <DataTable<AdminSentEmail>
            rows={selectedUserEmails}
            keyFor={(e) => e.id}
            emptyMessage="Todavía no se ha enviado ningún email a este usuario."
            columns={[
              { header: 'Fecha', render: (e) => formatDate(e.sentAt ?? e.createdAt) },
              { header: 'Destinatario', render: (e) => e.recipientEmail },
              { header: 'Tipo', render: (e) => EMAIL_TYPE_LABELS[e.type] ?? e.type },
              { header: 'Asunto', render: (e) => e.subject },
              { header: 'Estado', render: (e) => EMAIL_STATUS_LABELS[e.status] ?? e.status },
              {
                header: 'Clic',
                render: (e) => (e.firstClickedAt ? <Check className="w-4 h-4 text-primary" /> : null),
              },
            ]}
          />
        )}
      </div>
    </div>
  );
}
