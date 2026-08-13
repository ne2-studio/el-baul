// @vitest-environment jsdom
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { ChatMenuContainer } from './ChatMenuContainer';

const baulId = 'baul-1';

function renderContainer() {
  return render(
    <MemoryRouter initialEntries={[`/baules/${baulId}/recordar`]}>
      <Routes>
        <Route path="/baules/:baulId/recordar" element={<ChatMenuContainer baulId={baulId} />} />
        <Route path="/baules/:baulId/recordar/memoria" element={<div>Pantalla de gestión de memoria</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ChatMenuContainer', () => {
  beforeEach(() => {
    useAppConfigStore.setState({ chatMemoryEnabled: false });
  });

  it('renders nothing when chat memory is disabled', () => {
    renderContainer();

    expect(screen.queryByRole('button', { name: 'Opciones del chat' })).not.toBeInTheDocument();
  });

  it('shows the menu trigger when chat memory is enabled', () => {
    useAppConfigStore.setState({ chatMemoryEnabled: true });

    renderContainer();

    expect(screen.getByRole('button', { name: 'Opciones del chat' })).toBeInTheDocument();
  });

  it('navigates to the memory management screen', async () => {
    useAppConfigStore.setState({ chatMemoryEnabled: true });
    const user = userEvent.setup();

    renderContainer();
    await user.click(screen.getByRole('button', { name: 'Opciones del chat' }));
    await user.click(await screen.findByText('Gestionar memoria'));

    expect(await screen.findByText('Pantalla de gestión de memoria')).toBeInTheDocument();
  });
});
