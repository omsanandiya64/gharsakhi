export function formatMoney(paise) {
  const rupees = Math.round(paise) / 100;
  const sign = rupees < 0 ? '-' : '';
  const formatted = Math.abs(rupees).toLocaleString('en-IN', {
    minimumFractionDigits: rupees % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${sign}₹${formatted}`;
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });
}
