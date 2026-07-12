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

/**
 * Gets formatted date string in Spanish
 * Format: "Agosto de 2019"
 */
export function getFormattedDate(date: Date): string {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${month} de ${year}`;
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
