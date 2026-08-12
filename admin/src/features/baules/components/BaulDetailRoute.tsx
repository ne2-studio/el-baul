import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Image, MessageSquare, Users, BookOpen, HardDrive, Trash2 } from 'lucide-react';
import { useBaulesStore } from '@/store/useBaulesStore';
import { DataTable } from '@/app/components/DataTable';
import { StatCard } from '@/app/components/StatCard';
import { ConfirmDeleteBaulModal } from '@/app/components/ConfirmDeleteBaulModal';
import { AsyncState } from '@/app/components/AsyncState';
import { formatDate, formatBytes } from '@/utils/format';
import { buildBaulLogsUrl } from '@/utils/logs';
import type { AdminBaulPersona } from '@/types';

export function BaulDetailRoute() {
  const { baulId } = useParams<{ baulId: string }>();
  const { selectedBaul, isLoading, error, fetchBaul, deleteBaul } = useBaulesStore();
  const navigate = useNavigate();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (baulId) fetchBaul(baulId);
  }, [baulId]);

  const handleDelete = async () => {
    if (!baulId) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteBaul(baulId);
      navigate('/baules');
    } catch (err) {
      setDeleteError((err as Error).message);
      setIsDeleting(false);
    }
  };

  return (
    <AsyncState isLoading={isLoading} error={error} hasData={!!selectedBaul}>
      {selectedBaul && (
        <div className="space-y-6">
          <button
            onClick={() => navigate('/baules')}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Baúles
          </button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="truncate">{selectedBaul.name}</h2>
              <p className="text-muted-foreground text-sm mt-1">Creado el {formatDate(selectedBaul.createdAt)}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0 self-start">
              <a
                href={buildBaulLogsUrl(selectedBaul.id)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm"
              >
                Ver logs
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar baúl
              </button>
            </div>
          </div>

          {showDeleteModal && (
            <ConfirmDeleteBaulModal
              baulName={selectedBaul.name}
              chapterCount={selectedBaul.stats.chapters}
              photoCount={selectedBaul.stats.photos}
              recuerdoCount={selectedBaul.stats.recuerdos}
              isSubmitting={isDeleting}
              error={deleteError}
              onCancel={() => setShowDeleteModal(false)}
              onConfirm={handleDelete}
            />
          )}

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard label="Fotos" value={selectedBaul.stats.photos} icon={Image} />
            <StatCard label="Recuerdos" value={selectedBaul.stats.recuerdos} icon={MessageSquare} />
            <StatCard label="Personas" value={selectedBaul.stats.personas} icon={Users} />
            <StatCard label="Capítulos" value={selectedBaul.stats.chapters} icon={BookOpen} />
            <StatCard label="Tamaño" value={formatBytes(selectedBaul.stats.totalSizeBytes)} icon={HardDrive} />
          </div>

          <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
            <h3 className="mb-4">Personas</h3>
            <DataTable<AdminBaulPersona>
              rows={selectedBaul.personas}
              keyFor={(p) => p.personId}
              emptyMessage="Este baúl no tiene personas todavía."
              columns={[
                { header: 'Nombre / Apodo', render: (p) => p.name || p.nickname },
                { header: 'Rol', render: (p) => (p.isCustodio ? 'Custodio' : p.role) },
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
      )}
    </AsyncState>
  );
}
