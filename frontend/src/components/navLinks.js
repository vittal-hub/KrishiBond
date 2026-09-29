import {
  LayoutGrid,
  Search,
  Heart,
  FileText,
  Wallet,
  Receipt,
  CreditCard,
  MessageSquare,
  BarChart3,
  ShieldAlert,
  LifeBuoy,
  LayoutDashboard,
} from 'lucide-react';

// Single source of truth for the app's primary navigation - shared by the
// desktop Sidebar and the mobile slide-out drawer so the two never drift
// out of sync with each other.
export const LINKS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { to: '/marketplace', label: 'Marketplace', icon: Search },
  { to: '/favourites', label: 'Favourites', icon: Heart },
  { to: '/contracts', label: 'Contracts', icon: FileText },
  { to: '/wallet', label: 'Wallet', icon: Wallet },
  { to: '/transactions', label: 'Transactions', icon: Receipt },
  { to: '/payment-history', label: 'Payment History', icon: CreditCard },
  { to: '/messages', label: 'Messages', icon: MessageSquare },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/disputes', label: 'Disputes', icon: ShieldAlert },
  { to: '/help', label: 'Help Center', icon: LifeBuoy },
];

export const ADMIN_LINK = { to: '/admin', label: 'Admin', icon: LayoutDashboard };
