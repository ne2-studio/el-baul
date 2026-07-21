import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ExternalLink, ArrowLeft } from 'lucide-react';
import { useUsersStore } from '@/store/useUsersStore';
import { DataTable } from '@/app/components/DataTable';
import { formatDate } from '@/utils/format';
import type { AdminUserBaulMembership } from '@/types';

const APP_URL = import.meta.env.VITE_APP_URL || 'http://localhost:3000';

export function UserDetailRoute() {
  const { userId } = useParams<{ userId: string }>();
  const { selectedUser, isLoading, error, fetchUser } = useUsersStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (userId) fetchUser(userId);
  }, [userId]);

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
    </div>
  );
}
