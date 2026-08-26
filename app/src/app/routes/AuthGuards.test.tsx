// @vitest-environment jsdom
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAuth } from 'react-oidc-context';
import { ProtectedRoute, PublicRoute, RequireAuth } from './AuthGuards';

vi.mock('react-oidc-context', () => ({
  useAuth: vi.fn(),
}));

const mockUseAuth = vi.mocked(useAuth);

describe('ProtectedRoute', () => {
  it('muestra una pantalla de carga (no un hueco en negro) mientras se resuelve la sesión', () => {
    mockUseAuth.mockReturnValue({ isLoading: true, isAuthenticated: false } as ReturnType<typeof useAuth>);

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>contenido protegido</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.queryByText('contenido protegido')).not.toBeInTheDocument();
    expect(screen.getByText('Cargando…')).toBeInTheDocument();
  });

  it('renderiza los hijos una vez autenticado', () => {
    mockUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: true } as ReturnType<typeof useAuth>);

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>contenido protegido</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('contenido protegido')).toBeInTheDocument();
  });
});

describe('RequireAuth', () => {
  it('renders children once authenticated', () => {
    mockUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: true } as ReturnType<typeof useAuth>);

    render(
      <MemoryRouter>
        <RequireAuth>
          <div>contenido protegido</div>
        </RequireAuth>
      </MemoryRouter>
    );

    expect(screen.getByText('contenido protegido')).toBeInTheDocument();
  });

  it('redirects to sign in with redirectTo when unauthenticated', () => {
    mockUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: false } as ReturnType<typeof useAuth>);

    // Rendered under a matching <Routes> (as it always is in App.tsx), not bare: the
    // <Navigate> RequireAuth returns changes the location to "/", which stops matching this
    // route and unmounts RequireAuth — bare, it would stay mounted and keep re-navigating.
    render(
      <MemoryRouter initialEntries={['/baules/1']}>
        <Routes>
          <Route path="/" element={<div>welcome</div>} />
          <Route
            path="/baules/1"
            element={
              <RequireAuth>
                <div>contenido protegido</div>
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByText('contenido protegido')).not.toBeInTheDocument();
    expect(screen.getByText('welcome')).toBeInTheDocument();
  });
});

describe('PublicRoute', () => {
  it('muestra una pantalla de carga (no un hueco en negro) mientras se resuelve la sesión', () => {
    mockUseAuth.mockReturnValue({ isLoading: true, isAuthenticated: false } as ReturnType<typeof useAuth>);

    render(
      <MemoryRouter>
        <PublicRoute>
          <div>contenido público</div>
        </PublicRoute>
      </MemoryRouter>
    );

    expect(screen.queryByText('contenido público')).not.toBeInTheDocument();
    expect(screen.getByText('Cargando…')).toBeInTheDocument();
  });

  it('renders children when unauthenticated', () => {
    mockUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: false } as ReturnType<typeof useAuth>);

    render(
      <MemoryRouter>
        <PublicRoute>
          <div>contenido público</div>
        </PublicRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('contenido público')).toBeInTheDocument();
  });
});
