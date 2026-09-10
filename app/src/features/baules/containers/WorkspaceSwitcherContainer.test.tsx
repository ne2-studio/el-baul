// @vitest-environment jsdom
import { MemoryRouter } from 'react-router-dom';
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

function renderSwitcher(active: Baul) {
  return render(
    <MemoryRouter initialEntries={[`/baules/${active.id}`]}>
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

    const trigger = screen.getByRole('button', { name: 'Cambiar de baúl' });
    expect(trigger.querySelectorAll('span.rounded-full.bg-primary')).toHaveLength(1);

    await userEvent.click(trigger);

    const menu = await screen.findByRole('menu');
    const abuelosRow = within(menu).getByText('Abuelos').closest('[role="menuitem"]') as HTMLElement;
    const garciaRow = within(menu).getByText('Familia García').closest('[role="menuitem"]') as HTMLElement;
    expect(abuelosRow.querySelectorAll('span.rounded-full.bg-primary')).toHaveLength(1);
    expect(garciaRow.querySelectorAll('span.rounded-full.bg-primary')).toHaveLength(0);
  });
});
