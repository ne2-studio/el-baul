// @vitest-environment jsdom
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { Baul } from '@/types';
import { useBaulesStore } from '@/store/useBaulesStore';
import { WorkspaceSwitcherContainer } from './WorkspaceSwitcherContainer';

function baul(overrides: Partial<Baul> = {}): Baul {
  return {
    id: 'baul-1',
    name: 'Familia García',
    chapterCount: 3,
    lastUpdated: 'hace 2 días',
    updatedAt: '2026-08-01T10:00:00Z',
    hasUnseenActivity: false,
    role: 'administrador',
    isCustodio: true,
    ...overrides,
  } as Baul;
}

function renderSwitcher(active: Baul | null) {
  return render(
    <MemoryRouter initialEntries={[active ? `/baules/${active.id}` : '/mis-fotos']}>
      <WorkspaceSwitcherContainer activeBaul={active} />
    </MemoryRouter>
  );
}

// The "novedad" dot is a class-only <span> (NewDot) with no text/role — count them by class.
function newDots(root: HTMLElement): number {
  return root.querySelectorAll('span.rounded-full.bg-primary').length;
}

describe('WorkspaceSwitcherContainer — novedad dots', () => {
  beforeEach(() => {
    useBaulesStore.getState().reset();
    localStorage.clear();
  });

  it('shows no dot when the server reports every baúl as seen (hasUnseenActivity=false)', () => {
    const a = baul({ id: 'baul-1' });
    const b = baul({ id: 'baul-2', name: 'Abuelos' });
    useBaulesStore.setState({ baules: [a, b] });

    const { container } = renderSwitcher(a);

    // Regression: this used to be computed from device-local localStorage, so a fresh
    // device/browser with no stored "seen" entry dotted every baúl here.
    expect(newDots(container)).toBe(0);
  });

  it('dots the trigger and only the unseen row when the server reports unseen activity', async () => {
    const a = baul({ id: 'baul-1', name: 'Familia García' });
    const b = baul({ id: 'baul-2', name: 'Abuelos', hasUnseenActivity: true });
    useBaulesStore.setState({ baules: [a, b] });

    renderSwitcher(a);

    const trigger = screen.getByRole('button', { name: 'Cambiar de espacio' });
    expect(trigger.querySelectorAll('span.rounded-full.bg-primary')).toHaveLength(1);

    await userEvent.click(trigger);

    const menu = await screen.findByRole('menu');
    const abuelosRow = within(menu).getByText('Abuelos').closest('[role="menuitem"]') as HTMLElement;
    const garciaRow = within(menu).getByText('Familia García').closest('[role="menuitem"]') as HTMLElement;
    expect(abuelosRow.querySelectorAll('span.rounded-full.bg-primary')).toHaveLength(1);
    expect(garciaRow.querySelectorAll('span.rounded-full.bg-primary')).toHaveLength(0);
  });
});

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderSwitcherWithRoutes(active: Baul | null) {
  return render(
    <MemoryRouter initialEntries={[active ? `/baules/${active.id}` : '/mis-fotos']}>
      <LocationDisplay />
      <Routes>
        <Route path="/baules/:baulId" element={<WorkspaceSwitcherContainer activeBaul={active} />} />
        <Route path="/mis-fotos" element={<WorkspaceSwitcherContainer activeBaul={active} />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('WorkspaceSwitcherContainer — PERSONAL / Mis baúles sections', () => {
  beforeEach(() => {
    useBaulesStore.getState().reset();
  });

  it('groups "Mis fotos" under PERSONAL and every baúl under Mis baúles', async () => {
    useBaulesStore.setState({ baules: [baul({ id: 'baul-1', name: 'Familia García' })] });
    renderSwitcherWithRoutes(baul({ id: 'baul-1', name: 'Familia García' }));

    await userEvent.click(screen.getByRole('button', { name: 'Cambiar de espacio' }));
    const menu = await screen.findByRole('menu');

    expect(within(menu).getByText('Personal')).toBeInTheDocument();
    expect(within(menu).getByText('Mis baúles')).toBeInTheDocument();
    expect(within(menu).getByText('Mis fotos')).toBeInTheDocument();
    expect(within(menu).getByText('Familia García')).toBeInTheDocument();
  });

  it('selecting "Mis fotos" navigates to /mis-fotos', async () => {
    const a = baul({ id: 'baul-1', name: 'Familia García' });
    useBaulesStore.setState({ baules: [a] });
    renderSwitcherWithRoutes(a);

    await userEvent.click(screen.getByRole('button', { name: 'Cambiar de espacio' }));
    await userEvent.click(await screen.findByText('Mis fotos'));

    expect(screen.getByTestId('location')).toHaveTextContent('/mis-fotos');
  });

  it('selecting a baúl still navigates to it as before, even from Mis fotos', async () => {
    const a = baul({ id: 'baul-1', name: 'Familia García' });
    useBaulesStore.setState({ baules: [a] });
    renderSwitcherWithRoutes(null);

    await userEvent.click(screen.getByRole('button', { name: 'Cambiar de espacio' }));
    await userEvent.click(await screen.findByText('Familia García'));

    expect(screen.getByTestId('location')).toHaveTextContent('/baules/baul-1');
  });

  it('shows "Mis fotos" (not any baúl name) as the trigger label when activeBaul is null', () => {
    renderSwitcherWithRoutes(null);
    expect(screen.getByRole('button', { name: 'Cambiar de espacio' })).toHaveTextContent('Mis fotos');
  });
});
