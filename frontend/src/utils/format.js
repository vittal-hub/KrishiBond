import { format, formatDistanceToNow } from 'date-fns';

export const formatCurrency = (value, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(
    value ?? 0
  );

export const formatDate = (date, pattern = 'dd MMM yyyy') => (date ? format(new Date(date), pattern) : '—');

export const formatRelative = (date) => (date ? formatDistanceToNow(new Date(date), { addSuffix: true }) : '—');

// Compact Indian-numbering currency, for chart axis labels where the full
// `formatCurrency` value ("₹20,00,000") is too wide to fit without clipping
// or cramping - never used for exact amounts (tooltips/totals keep using
// formatCurrency), only for space-constrained labels. Scales automatically
// with whatever the data actually is (thousand/lakh/crore), not tied to any
// assumed magnitude.
export const formatCompactINR = (value) => {
  const num = Number(value) || 0;
  const sign = num < 0 ? '-' : '';
  const abs = Math.abs(num);

  const trim = (n) => {
    const rounded = Math.round(n * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  };

  if (abs >= 1e7) return `${sign}₹${trim(abs / 1e7)}Cr`;
  if (abs >= 1e5) return `${sign}₹${trim(abs / 1e5)}L`;
  if (abs >= 1e3) return `${sign}₹${trim(abs / 1e3)}K`;
  return `${sign}₹${abs}`;
};
