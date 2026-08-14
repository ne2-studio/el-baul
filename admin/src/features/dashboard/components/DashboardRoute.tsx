import { useEffect } from 'react';
import { Users, Archive, Image, ImagePlus, MailOpen } from 'lucide-react';
import { useDashboardStore } from '@/store/useDashboardStore';
import { StatCard } from '@/app/components/StatCard';
import { ExternalLinksPanel } from '@/app/components/ExternalLinksPanel';
import { AsyncState } from '@/app/components/AsyncState';

function formatEmailOpenRate(sent: number, opened: number): string {
  if (sent === 0) return '—';
  const rate = Math.round((opened / sent) * 1000) / 10;
  return `${rate}% (${opened}/${sent})`;
}

export function DashboardRoute() {
  const { kpis, isLoading, error, fetchDashboard } = useDashboardStore();

  useEffect(() => {
    fetchDashboard();
  }, []);

  return (
    <AsyncState isLoading={isLoading} error={error} hasData={!!kpis}>
      {kpis && (
        <div className="space-y-6">
          <h2>Dashboard</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Usuarios registrados" value={kpis.registeredUsers} icon={Users} />
            <StatCard label="Baúles creados" value={kpis.totalBaules} icon={Archive} />
            <StatCard label="Fotos totales" value={kpis.totalPhotos} icon={Image} />
            <StatCard label="Fotos subidas hoy" value={kpis.photosUploadedToday} icon={ImagePlus} />
            <StatCard
              label="Tasa de apertura de emails (30d)"
              value={formatEmailOpenRate(kpis.emailsSentLast30Days, kpis.emailsOpenedLast30Days)}
              icon={MailOpen}
            />
          </div>

          <ExternalLinksPanel links={kpis.externalLinks} />
        </div>
      )}
    </AsyncState>
  );
}
