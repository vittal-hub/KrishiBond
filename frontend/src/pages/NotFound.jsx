import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-paper text-center px-4">
      <p className="font-mono text-xs uppercase tracking-widest text-harvest-600">Error 404</p>
      <h1 className="font-display text-3xl font-semibold mt-2">This field's gone fallow</h1>
      <p className="text-sm text-ink-faint mt-2 max-w-sm">
        The page you're looking for doesn't exist or may have moved.
      </p>
      <Link to="/dashboard" className="btn-primary mt-6">Back to dashboard</Link>
    </div>
  );
}
