import React from 'react';
import { Wheat } from 'lucide-react';

export default function Loader({ full = false, label = 'Loading' }) {
  const content = (
    <div className="flex flex-col items-center gap-3 text-ink-soft">
      <Wheat className="w-8 h-8 text-canopy-600 animate-pulse" />
      <span className="text-sm font-medium tracking-wide">{label}…</span>
    </div>
  );

  if (full) {
    return <div className="min-h-screen flex items-center justify-center bg-paper">{content}</div>;
  }
  return <div className="py-16 flex items-center justify-center">{content}</div>;
}
