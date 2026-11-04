const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

/**
 * Formats invoice timestamps and plain `YYYY-MM-DD` dates in UTC so the
 * server-rendered and hydrated markup always match.
 */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';

  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';

  return dateFormatter.format(date);
}
