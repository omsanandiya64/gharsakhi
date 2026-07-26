/**
 * `from`/`to` filters are IST calendar dates ('YYYY-MM-DD'). IST has no DST, so
 * the offset is always a fixed +05:30. "to" must be INCLUSIVE of the entire
 * end day, so instead of a fragile "23:59:59.999" upper bound we compute the
 * start of the *next* IST day and filter with a strict `<` - exact regardless
 * of timestamp precision.
 */
export function istDayStartUtc(dateStr) {
  return new Date(`${dateStr}T00:00:00+05:30`);
}

export function nextCalendarDay(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  const yyyy = next.getUTCFullYear();
  const mm = String(next.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(next.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
