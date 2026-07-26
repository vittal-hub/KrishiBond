import { format, formatDistanceToNow } from 'date-fns';

export const formatCurrency = (value, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(
    value ?? 0
  );

export const formatDate = (date, pattern = 'dd MMM yyyy') => (date ? format(new Date(date), pattern) : '—');

export const formatRelative = (date) => (date ? formatDistanceToNow(new Date(date), { addSuffix: true }) : '—');
