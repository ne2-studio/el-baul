import type { GalleryPhoto } from '@/types';

// Groups photos by year+month (or by year alone, when only a year is known — never
// assume a month for display, that defaulting only applies to sorting), with a trailing
// "Sin fecha" group for anything undated. Defaults to oldest-first so the baúl reads like
// a story; pass order: 'desc' for sources that are already newest-first (e.g. the device
// photo library), so newly-loaded pages keep appending below instead of resorting above.
// Generic over GalleryPhoto (only `date` is read) so both baúl-scoped Photo and cross-baúl
// PhotoAsset ("Mis fotos") can reuse the same grouping instead of duplicating it.
export function groupPhotosByYear<T extends GalleryPhoto>(
  photos: T[],
  order: 'asc' | 'desc' = 'asc'
): { label: string; photos: T[] }[] {
  const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const dir = order === 'asc' ? 1 : -1;

  const groups = new Map<string, { year: number; month?: number; photos: T[] }>();
  const undated: T[] = [];

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
    dir * (a.year !== b.year ? a.year - b.year : (a.month ?? 0) - (b.month ?? 0))
  );

  const result = sorted.map((g) => ({
    label: g.month ? `${MONTH_NAMES[g.month - 1]} ${g.year}` : `${g.year}`,
    photos: [...g.photos].sort((a, b) => dir * ((a.date?.day ?? 1) - (b.date?.day ?? 1))),
  }));

  if (undated.length > 0) result.push({ label: 'Sin fecha', photos: undated });

  return result;
}
