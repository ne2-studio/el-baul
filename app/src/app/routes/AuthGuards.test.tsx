// @vitest-environment jsdom
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAuth } from 'react-oidc-context';
import { ProtectedRoute, PublicRoute } from './AuthGuards';

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
});
