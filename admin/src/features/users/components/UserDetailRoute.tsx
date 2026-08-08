import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ExternalLink, ArrowLeft, Send, Check, Bug, Loader2, BellRing } from 'lucide-react';
import { useUsersStore } from '@/store/useUsersStore';
import { DataTable } from '@/app/components/DataTable';
import { AsyncState } from '@/app/components/AsyncState';
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
  const [debugBaulId, setDebugBaulId] = useState('');
  const [debugMessage, setDebugMessage] = useState('');
  const [debugContext, setDebugContext] = useState('');
  const [isDebuggingContext, setIsDebuggingContext] = useState(false);
  const [debugError, setDebugError] = useState<string | null>(null);

  const [pushMessage, setPushMessage] = useState('');
  const [pushDeepLink, setPushDeepLink] = useState('');
  const [isSendingPush, setIsSendingPush] = useState(false);
  const [pushResult, setPushResult] = useState<'success' | 'error' | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);

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

  const handleSendTestPush = async () => {
    if (!userId || !pushMessage.trim()) return;
    setIsSendingPush(true);
    setPushResult(null);
    setPushError(null);
    try {
      await api.pushNotifications.sendTest(userId, pushMessage.trim(), pushDeepLink.trim() || null);
      setPushResult('success');
    } catch (err) {
      setPushResult('error');
      setPushError(err instanceof Error ? err.message : 'No se pudo enviar la notificación.');
    } finally {
      setIsSendingPush(false);
    }
  };

  useEffect(() => {
    if (selectedUser?.baules.length) {
      setDebugBaulId((current) =>
        current && selectedUser.baules.some((b) => b.baulId === current) ? current : selectedUser.baules[0].baulId
      );
    } else {
      setDebugBaulId('');
    }
    setDebugContext('');
    setDebugError(null);
  }, [selectedUser?.id, selectedUser?.baules]);

  const handleDebugContext = async () => {
    if (!userId || !debugBaulId || !debugMessage.trim()) return;
    setIsDebuggingContext(true);
    setDebugContext('');
    setDebugError(null);
    try {
      const result = await api.users.debugChatContext(userId, debugBaulId, debugMessage.trim());
      setDebugContext(result.context);
    } catch (err) {
      setDebugError(err instanceof Error ? err.message : 'No se pudo generar el contexto.');
    } finally {
      setIsDebuggingContext(false);
    }
  };

  return (
    <AsyncState isLoading={isLoading} error={error} hasData={!!selectedUser}>
      {selectedUser && (
        <div className="space-y-6">
          <button
            onClick={() => navigate('/usuarios')}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Usuarios
          </button>

          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <h2 className="truncate">{selectedUser.name || selectedUser.email}</h2>
              <p className="text-muted-foreground text-sm mt-1 truncate">{selectedUser.email}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-col items-start md:items-end gap-1">
                <button
                  onClick={() => handleSendTest('welcome', api.emails.sendWelcomeTest)}
                  disabled={sending.welcome}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {sending.welcome ? 'Enviando…' : 'Enviar bienvenida de prueba'}
                </button>
                {results.welcome === 'success' && (
                  <p className="text-xs text-muted-foreground">Enviado a la dirección de prueba.</p>
                )}
                {results.welcome === 'error' && <p className="text-xs text-destructive">No se pudo enviar.</p>}
              </div>
              <div className="flex flex-col items-start md:items-end gap-1">
                <button
                  onClick={() => handleSendTest('digest', api.emails.sendDigestTest)}
                  disabled={sending.digest}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {sending.digest ? 'Enviando…' : 'Enviar digest de prueba'}
                </button>
                {results.digest === 'success' && (
                  <p className="text-xs text-muted-foreground">Enviado a la dirección de prueba.</p>
                )}
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
            <div className="flex items-center justify-between gap-4 mb-4">
              <h3>Debug contexto chat</h3>
              <button
                onClick={handleDebugContext}
                disabled={!debugBaulId || !debugMessage.trim() || isDebuggingContext}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm disabled:opacity-50"
              >
                {isDebuggingContext ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bug className="w-3.5 h-3.5" />}
                Generar contexto
              </button>
            </div>

            <div className="grid gap-4">
              <label className="grid gap-1.5 text-sm">
                <span className="text-xs text-muted-foreground">Baúl</span>
                <select
                  value={debugBaulId}
                  onChange={(event) => setDebugBaulId(event.target.value)}
                  disabled={selectedUser.baules.length === 0}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                >
                  {selectedUser.baules.map((baul) => (
                    <option key={baul.baulId} value={baul.baulId}>
                      {baul.baulName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1.5 text-sm">
                <span className="text-xs text-muted-foreground">Mensaje</span>
                <textarea
                  value={debugMessage}
                  onChange={(event) => setDebugMessage(event.target.value)}
                  rows={3}
                  placeholder="¿Qué recuerdas de las vacaciones?"
                  className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
              </label>

              {debugError && <p className="text-sm text-destructive">{debugError}</p>}

              {debugContext && (
                <pre className="max-h-[32rem] overflow-auto rounded-xl border border-border bg-muted p-4 text-xs leading-relaxed whitespace-pre-wrap">
                  {debugContext}
                </pre>
              )}
            </div>
          </div>

          <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h3>Notificación push de prueba</h3>
              <button
                onClick={handleSendTestPush}
                disabled={!selectedUser.hasPushToken || !pushMessage.trim() || isSendingPush}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm disabled:opacity-50"
              >
                {isSendingPush ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BellRing className="w-3.5 h-3.5" />}
                Enviar
              </button>
            </div>

            {!selectedUser.hasPushToken && (
              <p className="text-xs text-muted-foreground mb-4">Este usuario no tiene ningún dispositivo registrado.</p>
            )}

            <div className="grid gap-4">
              <label className="grid gap-1.5 text-sm">
                <span className="text-xs text-muted-foreground">Mensaje</span>
                <textarea
                  value={pushMessage}
                  onChange={(event) => setPushMessage(event.target.value)}
                  rows={3}
                  placeholder="Este es un aviso de prueba"
                  className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
              </label>

              <label className="grid gap-1.5 text-sm">
                <span className="text-xs text-muted-foreground">Deep link (opcional)</span>
                <input
                  type="text"
                  value={pushDeepLink}
                  onChange={(event) => setPushDeepLink(event.target.value)}
                  placeholder="/baules/abc-123"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
              </label>

              {pushResult === 'success' && <p className="text-xs text-muted-foreground">Notificación enviada.</p>}
              {pushResult === 'error' && <p className="text-sm text-destructive">{pushError}</p>}
            </div>
          </div>

          <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
            <h3 className="mb-4">Emails enviados</h3>
            <AsyncState
              isLoading={isLoadingEmails}
              error={null}
              hasData={selectedUserEmails.length > 0}
              renderWhenEmpty
              loadingClassName="text-muted-foreground text-sm"
            >
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
            </AsyncState>
          </div>
        </div>
      )}
    </AsyncState>
  );
}
