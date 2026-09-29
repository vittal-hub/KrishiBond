import React, { useState } from 'react';
import Navbar from './Navbar.jsx';
import Sidebar from './Sidebar.jsx';
import MobileSidebar from './MobileSidebar.jsx';

export default function AppLayout({ children }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-paper">
      <Navbar onMenuClick={() => setMobileNavOpen(true)} />
      {/* Rendered here (a sibling of Sidebar/main), not inside Navbar, so its
          fixed overlay/backdrop covers the whole viewport independent of
          Navbar's own sticky positioning and stacking context. */}
      <MobileSidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="max-w-7xl mx-auto flex">
        <Sidebar />
        <main className="flex-1 min-w-0 px-4 sm:px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
