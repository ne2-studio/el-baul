import { useEffect } from 'react';
import { Users, Archive, Image, ImagePlus } from 'lucide-react';
import { useDashboardStore } from '@/store/useDashboardStore';
import { StatCard } from '@/app/components/StatCard';
import { ExternalLinksPanel } from '@/app/components/ExternalLinksPanel';

export function DashboardRoute() {
  const { kpis, isLoading, error, fetchDashboard } = useDashboardStore();

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (isLoading && !kpis) {
    return <p className="text-muted-foreground">Cargando…</p>;
  }

  if (error) {
    return <p className="text-destructive">{error}</p>;
  }

  if (!kpis) return null;

  return (
    <div className="space-y-6">
      <h2>Dashboard</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Usuarios registrados" value={kpis.registeredUsers} icon={Users} />
        <StatCard label="Baúles creados" value={kpis.totalBaules} icon={Archive} />
        <StatCard label="Fotos totales" value={kpis.totalPhotos} icon={Image} />
        <StatCard label="Fotos subidas hoy" value={kpis.photosUploadedToday} icon={ImagePlus} />
      </div>

      <ExternalLinksPanel links={kpis.externalLinks} />
    </div>
  );
}
