import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';

const mockUseAuth = vi.fn();
vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => mockUseAuth(),
}));

function renderAt(path, allowedRoles) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/dashboard" element={<div>Dashboard page</div>} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={allowedRoles}>
              <div>Admin page</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  it('shows a loader while the session is still resolving', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, loading: true, role: null });
    renderAt('/admin', ['admin']);
    expect(screen.getByText(/checking your session/i)).toBeInTheDocument();
  });

  it('redirects to /login when not authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, loading: false, role: null });
    renderAt('/admin', ['admin']);
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('redirects to /dashboard when authenticated but role is not allowed', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, loading: false, role: 'farmer' });
    renderAt('/admin', ['admin']);
    expect(screen.getByText('Dashboard page')).toBeInTheDocument();
  });

  it('renders the protected content for an allowed role', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, loading: false, role: 'admin' });
    renderAt('/admin', ['admin']);
    expect(screen.getByText('Admin page')).toBeInTheDocument();
  });

  it('renders the protected content when no role restriction is set', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, loading: false, role: 'buyer' });
    renderAt('/admin', undefined);
    expect(screen.getByText('Admin page')).toBeInTheDocument();
  });
});
