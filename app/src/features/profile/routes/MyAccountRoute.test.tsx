// @vitest-environment jsdom
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MyAccountRoute } from './MyAccountRoute';

function renderRoute(props: Partial<{ onSignOut: () => void; isSigningOut: boolean }> = {}) {
  const onSignOut = props.onSignOut ?? vi.fn();
  return {
    onSignOut,
    ...render(
      <MemoryRouter initialEntries={['/cuenta']}>
        <Routes>
          <Route
            path="/cuenta"
            element={<MyAccountRoute onSignOut={onSignOut} isSigningOut={props.isSigningOut} />}
          />
          <Route path="/baules" element={<div>Pantalla del baúl</div>} />
          <Route path="/perfil" element={<div>Mi perfil</div>} />
          <Route path="/configuracion/notificaciones" element={<div>Notificaciones</div>} />
        </Routes>
      </MemoryRouter>
    ),
  };
}

describe('MyAccountRoute', () => {
  it('navigates to "Mi perfil"', async () => {
    const user = userEvent.setup();
    renderRoute();

    await user.click(screen.getByText('Mi perfil'));

    expect(await screen.findByText('Mi perfil')).toBeInTheDocument();
  });

  it('navigates to "Notificaciones"', async () => {
    const user = userEvent.setup();
    renderRoute();

    await user.click(screen.getByText('Notificaciones'));

    expect(await screen.findByText('Notificaciones')).toBeInTheDocument();
  });

  it('navigates back to the main screen', async () => {
    const user = userEvent.setup();
    renderRoute();

    await user.click(screen.getByRole('button', { name: 'Volver' }));

    expect(await screen.findByText('Pantalla del baúl')).toBeInTheDocument();
  });

  it('calls onSignOut when "Cerrar sesión" is clicked', async () => {
    const user = userEvent.setup();
    const { onSignOut } = renderRoute();

    await user.click(screen.getByText('Cerrar sesión'));

    expect(onSignOut).toHaveBeenCalled();
  });
});
