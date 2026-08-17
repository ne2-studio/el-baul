// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PwaUpdateBanner } from './PwaUpdateBanner';
import { usePwaUpdateStore } from '@/store/usePwaUpdateStore';

// Regresión issue #34: "abro la app, sale una recomendación, y a los 2 segundos se refresca
// sola y me cambia la recomendación". Con registerType: 'autoUpdate' (vite.config.ts) el
// service worker recargaba la página sin avisar en cuanto detectaba una versión nueva. Ahora
// (registerType: 'prompt') una versión nueva solo debe marcar updateAvailable — nunca recargar
// por sí sola — y la recarga solo debe ocurrir cuando la persona confirma el aviso.
describe('PwaUpdateBanner', () => {
  beforeEach(() => {
    usePwaUpdateStore.setState({ updateAvailable: false, applyUpdate: () => {} });
  });

  it('renders nothing while no new version has been detected', () => {
    render(<PwaUpdateBanner />);

    expect(screen.queryByText('Hay una versión nueva disponible')).not.toBeInTheDocument();
  });

  it('shows a persistent, actionable notice once a new version is detected, without reloading on its own', () => {
    const applyUpdate = vi.fn();

    render(<PwaUpdateBanner />);
    act(() => usePwaUpdateStore.getState().setUpdateAvailable(applyUpdate));

    expect(screen.getByText('Hay una versión nueva disponible')).toBeInTheDocument();
    expect(screen.getByText('Toca para actualizar')).toBeInTheDocument();
    // La versión nueva ya fue detectada, pero nada debe haberse aplicado todavía — la persona
    // no ha tocado el aviso.
    expect(applyUpdate).not.toHaveBeenCalled();
  });

  it('only applies the update once the person taps the banner', async () => {
    const applyUpdate = vi.fn();
    const user = userEvent.setup();

    render(<PwaUpdateBanner />);
    act(() => usePwaUpdateStore.getState().setUpdateAvailable(applyUpdate));
    await user.click(screen.getByText('Hay una versión nueva disponible'));

    expect(applyUpdate).toHaveBeenCalledTimes(1);
  });
});
