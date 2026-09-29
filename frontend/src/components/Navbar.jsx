import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Settings,
  Sprout,
  User,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useNotifications } from "../hooks/useNotifications.js";
import { formatRelative } from "../utils/format";

const CATEGORY_LABELS = {
  contract: "Contract",
  payment: "Payment",
  offer: "Offer",
  kyc: "KYC",
  dispute: "Dispute",
  message: "Message",
  system: "KrishiBond",
};

export default function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { notifications, unreadCount, markRead, markAllRead } =
    useNotifications();
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const menuRef = useRef(null);
  const bellRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setMenuOpen(false);
      if (bellRef.current && !bellRef.current.contains(e.target))
        setBellOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-paper/90 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              aria-label="Open menu"
              className="lg:hidden -ml-2 p-2 rounded-stub hover:bg-ink/5 transition"
            >
              <Menu className="w-5 h-5 text-ink-soft" />
            </button>
          )}
          {/* This Navbar only ever renders inside AppLayout, i.e. only for an
              already-authenticated user - the logo is pure navigation to
              their home (Dashboard), never "/", which is the public
              marketing page and would otherwise render the logged-out
              header on top of a still-valid session (see Landing.jsx). */}
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-stub bg-canopy-600 flex items-center justify-center">
              <Sprout className="w-4.5 h-4.5 text-paper" size={18} />
            </div>
            <span className="font-display text-lg font-semibold text-ink">
              KrishiBond
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative" ref={bellRef}>
            <button
              onClick={() => setBellOpen((v) => !v)}
              className="relative p-2 rounded-stub hover:bg-ink/5 transition"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5 text-ink-soft" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-clay-500 text-[10px] text-paper font-bold flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            {bellOpen && (
              <div className="absolute right-0 mt-2 w-80 stub-card overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-ink/10">
                  <span className="text-sm font-semibold">Notifications</span>
                  <button
                    onClick={markAllRead}
                    className="text-xs text-canopy-700 font-medium hover:underline"
                  >
                    Mark all read
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 && (
                    <p className="px-4 py-6 text-sm text-ink-faint text-center">
                      Nothing new right now.
                    </p>
                  )}
                  {notifications.map((n) => (
                    <button
                      key={n._id}
                      onClick={() => {
                        markRead(n._id);
                        setBellOpen(false);
                        if (n.link) navigate(n.link);
                      }}
                      className={`w-full text-left px-4 py-3 text-sm border-b border-ink/5 hover:bg-canopy-50 transition ${
                        !n.read ? "bg-harvest-50/50" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-ink font-medium text-xs uppercase tracking-wide">
                          {CATEGORY_LABELS[n.category] ?? "KrishiBond"}
                        </p>
                        <span className="text-ink-faint text-[10px] whitespace-nowrap">
                          {formatRelative(n.createdAt)}
                        </span>
                      </div>
                      <p className="text-ink-soft text-xs mt-1">{n.message}</p>
                    </button>
                  ))}
                </div>
                <Link
                  to="/profile"
                  onClick={() => setBellOpen(false)}
                  className="block px-4 py-2.5 text-xs text-center text-canopy-700 font-medium hover:bg-canopy-50 border-t border-ink/10"
                >
                  Manage notification settings
                </Link>
              </div>
            )}
          </div>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-stub hover:bg-ink/5 transition"
            >
              <div className="w-8 h-8 rounded-full bg-harvest-200 flex items-center justify-center text-ink font-semibold text-sm">
                {user?.name?.[0]?.toUpperCase() ?? "U"}
              </div>
              <span className="hidden sm:block text-sm font-medium text-ink">
                {user?.name}
              </span>
              <ChevronDown className="w-4 h-4 text-ink-faint" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 stub-card overflow-hidden py-1">
                <div className="px-4 py-2 border-b border-ink/10">
                  <p className="text-sm font-medium text-ink truncate">
                    {user?.name}
                  </p>
                  <p className="text-xs text-ink-faint capitalize">
                    {user?.role}
                  </p>
                </div>
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-ink/5"
                >
                  <User className="w-4 h-4" /> Profile
                </Link>
                <Link
                  to="/help"
                  className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-ink/5"
                >
                  <Settings className="w-4 h-4" /> Help Center
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-clay-600 hover:bg-clay-50"
                >
                  <LogOut className="w-4 h-4" /> Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
