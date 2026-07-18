/**
 * Utility functions for calculating relative time in natural Spanish
 * Used in El Baúl to add emotional context to memories
 */

/**
 * Gets relative time string in natural Spanish
 * Examples: "Hoy", "Hace 2 días", "Hace 3 meses", "Hace 2 años"
 */
export function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  const diffInMonths = Math.floor(diffInDays / 30);
  const diffInYears = Math.floor(diffInDays / 365);

  // Today
  if (diffInDays === 0) {
    return 'Hoy';
  }

  // Yesterday
  if (diffInDays === 1) {
    return 'Ayer';
  }

  // Days (up to 6 days)
  if (diffInDays < 7) {
    return `Hace ${diffInDays} días`;
  }

  // Weeks (up to 4 weeks)
  if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return weeks === 1 ? 'Hace una semana' : `Hace ${weeks} semanas`;
  }

  // Months (up to 11 months)
  if (diffInMonths < 12) {
    return diffInMonths === 1 ? 'Hace un mes' : `Hace ${diffInMonths} meses`;
  }

  // Years
  return diffInYears === 1 ? 'Hace un año' : `Hace ${diffInYears} años`;
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/**
 * Gets formatted date string in Spanish
 * Format: "Agosto de 2019"
 */
export function getFormattedDate(date: Date): string {
  return `${MONTHS[date.getMonth()]} de ${date.getFullYear()}`;
}

/**
 * Formats a (possibly partial) photo date, respecting its precision:
 * year+month+day -> "3 de agosto de 2019", year+month -> "Agosto de 2019", year only -> "2019".
 * Never assumes a missing month/day — that defaulting only applies to sorting, not display.
 */
export function formatPartialDate(date: { year: number; month?: number; day?: number }): string {
  if (date.day && date.month) return `${date.day} de ${MONTHS[date.month - 1].toLowerCase()} de ${date.year}`;
  if (date.month) return `${MONTHS[date.month - 1]} de ${date.year}`;
  return `${date.year}`;
}

/**
 * Formats an album's date range from its min/max photo dates. Empty string when
 * there are no dated photos at all.
 */
export function formatDateRange(
  min?: { year: number; month?: number; day?: number },
  max?: { year: number; month?: number; day?: number }
): string {
  if (!min || !max) return '';
  const from = formatPartialDate(min);
  const to = formatPartialDate(max);
  return from === to ? from : `${from} – ${to}`;
}

/**
 * Parses a date string or returns current date if invalid
 */
export function parsePhotoDate(dateString?: string): Date {
  if (!dateString) {
    return new Date();
  }

  const parsed = new Date(dateString);
  
  // Check if date is valid
  if (isNaN(parsed.getTime())) {
    return new Date();
  }

  return parsed;
}
