import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { X, LogOut, Sprout } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { LINKS, ADMIN_LINK } from './navLinks.js';

/**
 * Mobile-only slide-out navigation drawer - the phone/tablet equivalent of
 * the desktop Sidebar (hidden below the `lg` breakpoint), sharing the exact
 * same LINKS/ADMIN_LINK list so the two can never list different pages.
 * Rendered at the AppLayout level (a sibling of Sidebar/main), not inside
 * Navbar, so its overlay is never clipped by Navbar's own stacking context.
 */
export default function MobileSidebar({ open, onClose }) {
  const { role, logout } = useAuth();
  const links = role === 'admin' ? [...LINKS, ADMIN_LINK] : LINKS;

  // Lock body scroll while the drawer is open so the page behind it can't
  // scroll along with it on touch devices - restored on close/unmount so a
  // route change or unrelated re-render never leaves scrolling stuck off.
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const handleLogout = async () => {
    onClose();
    await logout();
  };

  return (
    <div
      className={`lg:hidden fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      {/* Backdrop - clicking outside the panel closes the drawer. */}
      <div
        className={`absolute inset-0 bg-ink/50 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      <aside
        className={`absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-paper-card shadow-stub flex flex-col transition-transform duration-200 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <div className="flex items-center justify-between px-4 h-16 border-b border-ink/10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-stub bg-canopy-600 flex items-center justify-center">
              <Sprout className="w-4.5 h-4.5 text-paper" size={18} />
            </div>
            <span className="font-display text-lg font-semibold">KrishiBond</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="p-2 rounded-stub hover:bg-ink/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="flex flex-col gap-1">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-3 rounded-stub text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-canopy-600 text-paper'
                      : 'text-ink-soft hover:bg-canopy-50 hover:text-canopy-700'
                  }`
                }
              >
                <Icon className="w-4.5 h-4.5 shrink-0" size={18} />
                {label}
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="p-3 border-t border-ink/10 shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-stub text-sm font-medium text-clay-600 hover:bg-clay-50 transition-colors"
          >
            <LogOut className="w-4.5 h-4.5" size={18} /> Log out
          </button>
        </div>
      </aside>
    </div>
  );
}
