// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Persona } from '@/types';
import { PersonasTab } from './PersonasTab';

const basePersona = {
  baulId: 'b1',
  isCustodio: false,
  invitedDate: '2026-01-01T00:00:00Z',
  canEdit: true,
};

const miembro = new Persona({ ...basePersona, id: '1', email: 'yo@example.com', nickname: 'Yo', status: 'active', role: 'administrador' });
const pendiente = new Persona({ ...basePersona, id: '2', nickname: 'Tío Paco', status: 'pending', role: 'colaborador' });
const sinAcceso = new Persona({ ...basePersona, id: '3', nickname: 'Primo lejano', status: 'pending', role: 'sin_acceso' });

describe('PersonasTab', () => {
  it('groups personas into Miembros del baúl, Pendientes de unirse and a collapsed Sin acceso', () => {
    render(<PersonasTab personas={[miembro, pendiente, sinAcceso]} onSelectPersona={vi.fn()} />);

    expect(screen.getByText('Miembros del baúl')).toBeInTheDocument();
    expect(screen.getByText('Pendientes de unirse')).toBeInTheDocument();
    expect(screen.getByText('Sin acceso')).toBeInTheDocument();

    expect(screen.getByText('Yo')).toBeInTheDocument();
    expect(screen.getByText('Tío Paco')).toBeInTheDocument();
    // Sin acceso group is collapsed by default.
    expect(screen.queryByText('Primo lejano')).not.toBeInTheDocument();
  });

  it('expands the Sin acceso group when its header is clicked', async () => {
    const user = userEvent.setup();
    render(<PersonasTab personas={[sinAcceso]} onSelectPersona={vi.fn()} />);

    expect(screen.queryByText('Primo lejano')).not.toBeInTheDocument();

    await user.click(screen.getByText('Sin acceso'));

    expect(screen.getByText('Primo lejano')).toBeInTheDocument();
  });

  it('hides a group entirely when it is empty', () => {
    render(<PersonasTab personas={[miembro]} onSelectPersona={vi.fn()} />);

    expect(screen.getByText('Miembros del baúl')).toBeInTheDocument();
    expect(screen.queryByText('Pendientes de unirse')).not.toBeInTheDocument();
    expect(screen.queryByText('Sin acceso')).not.toBeInTheDocument();
  });

  it('calls onSelectPersona when a card in Sin acceso is clicked after expanding', async () => {
    const user = userEvent.setup();
    const onSelectPersona = vi.fn();
    render(<PersonasTab personas={[sinAcceso]} onSelectPersona={onSelectPersona} />);

    await user.click(screen.getByText('Sin acceso'));
    await user.click(screen.getByText('Primo lejano'));

    expect(onSelectPersona).toHaveBeenCalledWith(sinAcceso);
  });
});
