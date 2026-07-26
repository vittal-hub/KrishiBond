import React from 'react';
import { Clock, CheckCircle2, PackageCheck, AlertTriangle, XCircle } from 'lucide-react';

const CONFIG = {
  pending: { cls: 'stamp-pending', icon: Clock, label: 'Pending' },
  active: { cls: 'stamp-active', icon: CheckCircle2, label: 'Active' },
  fulfilled: { cls: 'stamp-fulfilled', icon: PackageCheck, label: 'Fulfilled' },
  disputed: { cls: 'stamp-disputed', icon: AlertTriangle, label: 'Disputed' },
  cancelled: { cls: 'stamp-cancelled', icon: XCircle, label: 'Cancelled' },
};

export default function StatusStamp({ status }) {
  const entry = CONFIG[status] ?? CONFIG.pending;
  const Icon = entry.icon;
  return (
    <span className={`stamp ${entry.cls}`}>
      <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
      {entry.label}
    </span>
  );
}
