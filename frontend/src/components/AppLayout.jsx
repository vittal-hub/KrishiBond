import React from 'react';
import Navbar from './Navbar.jsx';
import Sidebar from './Sidebar.jsx';

export default function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <div className="max-w-7xl mx-auto flex">
        <Sidebar />
        <main className="flex-1 min-w-0 px-4 sm:px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
