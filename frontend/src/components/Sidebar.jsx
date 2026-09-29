import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { LINKS, ADMIN_LINK } from './navLinks.js';

export default function Sidebar() {
  const { role } = useAuth();
  const links = role === 'admin' ? [...LINKS, ADMIN_LINK] : LINKS;

  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-ink/10 min-h-[calc(100vh-4rem)] py-6 px-3">
      <nav className="flex flex-col gap-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-stub text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-canopy-600 text-paper'
                  : 'text-ink-soft hover:bg-canopy-50 hover:text-canopy-700'
              }`
            }
          >
            <Icon className="w-4.5 h-4.5" size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto stub-card p-4 mx-1">
        <p className="text-xs font-semibold text-canopy-700 uppercase tracking-wide">Escrow protected</p>
        <p className="text-xs text-ink-faint mt-1 leading-relaxed">
          Every contract's payment sits in escrow until both sides confirm delivery.
        </p>
      </div>
    </aside>
  );
}
