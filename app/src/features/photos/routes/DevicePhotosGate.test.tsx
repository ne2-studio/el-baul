// @vitest-environment jsdom
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { DevicePhotosGate } from './DevicePhotosGate';

function renderGated() {
  return render(
    <MemoryRouter initialEntries={['/en-este-dispositivo']}>
      <Routes>
        <Route path="/en-este-dispositivo" element={<DevicePhotosGate><div>Contenido</div></DevicePhotosGate>} />
        <Route path="/mis-fotos" element={<div>Mis fotos</div>} />
      </Routes>
    </MemoryRouter>
  );
}

// Direct navigation/deep-link coverage for the DevicePhotosEnabled ops kill switch
// (docs/.backlog issue #83) — WorkspaceSwitcherContainer hiding the menu entry is covered
// separately by its own test; this covers what stops a URL that bypasses the menu entirely.
describe('DevicePhotosGate', () => {
  beforeEach(() => {
    useAppConfigStore.setState({ devicePhotosEnabled: true });
  });

  it('renders its children while the flag is on', () => {
    renderGated();

    expect(screen.getByText('Contenido')).toBeInTheDocument();
  });

  it('redirects to /mis-fotos once the ops kill switch is off', () => {
    useAppConfigStore.setState({ devicePhotosEnabled: false });
    renderGated();

    expect(screen.queryByText('Contenido')).not.toBeInTheDocument();
    expect(screen.getByText('Mis fotos')).toBeInTheDocument();
  });
});
