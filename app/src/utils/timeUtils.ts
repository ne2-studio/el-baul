// Format timestamps to relative time in Spanish
export function formatRelativeTime(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  
  if (diffSec < 60) return 'ahora';
  if (diffMin === 1) return 'hace 1 minuto';
  if (diffMin < 60) return `hace ${diffMin} minutos`;
  if (diffHour === 1) return 'hace 1 hora';
  if (diffHour < 24) return `hace ${diffHour} horas`;
  if (diffDay === 1) return 'ayer';
  if (diffDay < 7) return `hace ${diffDay} días`;
  if (diffWeek === 1) return 'hace 1 semana';
  if (diffWeek < 4) return `hace ${diffWeek} semanas`;
  if (diffMonth === 1) return 'hace 1 mes';
  if (diffMonth < 12) return `hace ${diffMonth} meses`;
  return 'hace más de 1 año';
}
