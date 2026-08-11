import type { Photo } from '@/types';

// Groups photos by year+month (or by year alone, when only a year is known — never
// assume a month for display, that defaulting only applies to sorting), oldest first so
// the baúl reads like a story, with a trailing "Sin fecha" group for anything undated.
export function groupPhotosByYear(photos: Photo[]): { label: string; photos: Photo[] }[] {
  const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const groups = new Map<string, { year: number; month?: number; photos: Photo[] }>();
  const undated: Photo[] = [];

  for (const photo of photos) {
    if (!photo.date) {
      undated.push(photo);
      continue;
    }
    const { year, month } = photo.date;
    const key = month ? `${year}-${month}` : `${year}`;
    if (!groups.has(key)) groups.set(key, { year, month, photos: [] });
    groups.get(key)!.photos.push(photo);
  }

  const sorted = Array.from(groups.values()).sort((a, b) =>
    a.year !== b.year ? a.year - b.year : (a.month ?? 0) - (b.month ?? 0)
  );

  const result = sorted.map((g) => ({
    label: g.month ? `${MONTH_NAMES[g.month - 1]} ${g.year}` : `${g.year}`,
    photos: [...g.photos].sort((a, b) => (a.date?.day ?? 1) - (b.date?.day ?? 1)),
  }));

  if (undated.length > 0) result.push({ label: 'Sin fecha', photos: undated });

  return result;
}
