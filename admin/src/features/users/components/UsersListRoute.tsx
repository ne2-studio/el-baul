import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUsersStore } from '@/store/useUsersStore';
import { DataTable } from '@/app/components/DataTable';
import { InitialsAvatar } from '@/app/components/InitialsAvatar';
import { formatDate } from '@/utils/format';
import type { AdminUser } from '@/types';

export function UsersListRoute() {
  const { users, isLoading, error, fetchUsers } = useUsersStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="space-y-6">
      <h2>Usuarios</h2>

      {isLoading && users.length === 0 && <p className="text-muted-foreground">Cargando…</p>}
      {error && <p className="text-destructive">{error}</p>}

      {!isLoading || users.length > 0 ? (
        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <DataTable<AdminUser>
            rows={users}
            keyFor={(u) => u.id}
            onRowClick={(u) => navigate(`/usuarios/${u.id}`)}
            columns={[
              { header: '', render: (u) => <InitialsAvatar name={u.name} fallback={u.email} /> },
              { header: 'Nombre', render: (u) => u.name || '—' },
              { header: 'Email', render: (u) => u.email },
              { header: 'Fecha de registro', render: (u) => formatDate(u.createdAt) },
              { header: 'Último acceso', render: (u) => formatDate(u.lastAccessAt) },
              { header: 'Baúles', render: (u) => u.baulCount },
            ]}
          />
        </div>
      ) : null}
    </div>
  );
}
