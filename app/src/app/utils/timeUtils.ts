/**
 * Utility functions for calculating relative time in natural Spanish
 * Used in El Baúl to add emotional context to memories
 */

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const MONTH_ABBREVIATIONS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

/**
 * Gets relative time string in natural Spanish, at a resolution that decays as the event
 * recedes into the past.
 *
 * The feed isn't for auditing exactly when something happened — it's for sensing what's
 * recently going on in the family. So precision has decreasing value: high in the first
 * minutes/hours (there's a real difference between "just happened" and "part of today"),
 * deliberately coarse from "today" onward (nobody needs "hace 17 h" vs "hoy"), and finally an
 * absolute date once placing the event on the calendar matters more than pinpointing it.
 *
 * < 1 min -> ahora            7-13 días -> hace 1 semana
 * < 1 h   -> hace X min       >= 14 días, same year -> "23 jul"
 * < 6 h   -> hace X h         other year -> "23 jul 2025"
 * < 24 h  -> hoy
 * < 48 h  -> ayer
 * < 7 días -> hace X días
 */
export function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (60 * 1000));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  // Also covers clock skew (diffInMs < 0, i.e. a timestamp slightly in the future).
  if (diffInMs < 60 * 1000) return 'ahora';
  if (diffInMinutes < 60) return `hace ${diffInMinutes} min`;
  if (diffInHours < 6) return `hace ${diffInHours} h`;
  if (diffInHours < 24) return 'hoy';
  if (diffInDays === 1) return 'ayer';
  if (diffInDays < 7) return `hace ${diffInDays} días`;
  if (diffInDays < 14) return 'hace 1 semana';

  const day = date.getDate();
  const month = MONTH_ABBREVIATIONS[date.getMonth()];
  if (date.getFullYear() === now.getFullYear()) return `${day} ${month}`;
  return `${day} ${month} ${date.getFullYear()}`;
}

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
 * Formats a chapter's date range from its min/max photo dates. Empty string when
 * there are no dated photos at all.
 *
 * Elides the parts min/max share instead of repeating them in full on both ends:
 * - same year+month+day precision on both ends, same year and month ->
 *   "23-26 de septiembre de 2027"
 * - same year, both day-precision, different month -> "23 agosto - 21 septiembre de 2026"
 * - anything else (different year, or mismatched precision between min/max) falls back
 *   to the full "<from> – <to>" form, each side formatted independently.
 */
export function formatDateRange(
  min?: { year: number; month?: number; day?: number },
  max?: { year: number; month?: number; day?: number }
): string {
  if (!min || !max) return '';

  const from = formatPartialDate(min);
  const to = formatPartialDate(max);
  if (from === to) return from;

  const sameYear = min.year === max.year;

  if (sameYear && min.month != null && min.month === max.month && min.day != null && max.day != null) {
    return `${min.day}-${max.day} de ${MONTHS[min.month - 1].toLowerCase()} de ${min.year}`;
  }

  if (sameYear && min.month != null && max.month != null && min.day != null && max.day != null) {
    return `${min.day} ${MONTHS[min.month - 1].toLowerCase()} - ${max.day} ${MONTHS[max.month - 1].toLowerCase()} de ${min.year}`;
  }

  return `${from} – ${to}`;
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
