import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBaulesStore } from '@/store/useBaulesStore';
import { DataTable } from '@/app/components/DataTable';
import { formatDate } from '@/utils/format';
import type { AdminBaul } from '@/types';

export function BaulesListRoute() {
  const { baules, isLoading, error, fetchBaules } = useBaulesStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchBaules();
  }, []);

  return (
    <div className="space-y-6">
      <h2>Baúles</h2>

      {isLoading && baules.length === 0 && <p className="text-muted-foreground">Cargando…</p>}
      {error && <p className="text-destructive">{error}</p>}

      {!isLoading || baules.length > 0 ? (
        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <DataTable<AdminBaul>
            rows={baules}
            keyFor={(b) => b.id}
            onRowClick={(b) => navigate(`/baules/${b.id}`)}
            columns={[
              { header: 'Nombre', render: (b) => b.name },
              { header: 'Custodio', render: (b) => b.custodioName },
              { header: 'Miembros', render: (b) => b.memberCount },
              { header: 'Usuarios unidos', render: (b) => b.linkedUserCount },
              { header: 'Fotos', render: (b) => b.photoCount },
              { header: 'Capítulos', render: (b) => b.albumCount },
              { header: 'Fecha de creación', render: (b) => formatDate(b.createdAt) },
            ]}
          />
        </div>
      ) : null}
    </div>
  );
}
