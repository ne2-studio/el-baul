import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Image, MessageSquare, Users, BookOpen } from 'lucide-react';
import { useBaulesStore } from '@/store/useBaulesStore';
import { DataTable } from '@/app/components/DataTable';
import { StatCard } from '@/app/components/StatCard';
import { formatDate } from '@/utils/format';
import type { AdminBaulPersona } from '@/types';

export function BaulDetailRoute() {
  const { baulId } = useParams<{ baulId: string }>();
  const { selectedBaul, isLoading, error, fetchBaul } = useBaulesStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (baulId) fetchBaul(baulId);
  }, [baulId]);

  if (isLoading && !selectedBaul) return <p className="text-muted-foreground">Cargando…</p>;
  if (error) return <p className="text-destructive">{error}</p>;
  if (!selectedBaul) return null;

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/baules')}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        Baúles
      </button>

      <div>
        <h2>{selectedBaul.name}</h2>
        <p className="text-muted-foreground text-sm mt-1">Creado el {formatDate(selectedBaul.createdAt)}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Fotos" value={selectedBaul.stats.photos} icon={Image} />
        <StatCard label="Recuerdos" value={selectedBaul.stats.recuerdos} icon={MessageSquare} />
        <StatCard label="Personas" value={selectedBaul.stats.personas} icon={Users} />
        <StatCard label="Capítulos" value={selectedBaul.stats.chapters} icon={BookOpen} />
      </div>

      <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
        <h3 className="mb-4">Personas</h3>
        <DataTable<AdminBaulPersona>
          rows={selectedBaul.personas}
          keyFor={(p) => p.personId}
          emptyMessage="Este baúl no tiene personas todavía."
          columns={[
            { header: 'Nombre / Apodo', render: (p) => p.name || p.nickname },
            { header: 'Rol', render: (p) => p.role },
            { header: 'PersonId', render: (p) => <span className="font-mono text-xs">{p.personId}</span> },
            {
              header: 'Usuario vinculado',
              render: (p) =>
                p.linkedUserId ? (
                  <button onClick={() => navigate(`/usuarios/${p.linkedUserId}`)} className="text-primary hover:underline">
                    {p.linkedUserName || p.linkedUserId}
                  </button>
                ) : (
                  <span className="text-muted-foreground">Sin cuenta</span>
                ),
            },
          ]}
        />
      </div>

      <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
        <h3 className="mb-4">Capítulos</h3>
        {selectedBaul.chapters.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4">Este baúl no tiene capítulos todavía.</p>
        ) : (
          <ul className="divide-y divide-border">
            {selectedBaul.chapters.map((c) => (
              <li key={c.id} className="py-2.5 flex items-center justify-between text-sm">
                <span>{c.name}</span>
                <span className="text-muted-foreground">{c.photoCount} fotos</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
