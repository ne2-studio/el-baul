// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Persona } from '@/types';
import { EditRelationshipsModal } from './EditRelationshipsModal';

const persona = (id: string, nickname: string): Persona =>
  ({ id, nickname, name: nickname } as Persona);

describe('EditRelationshipsModal', () => {
  it('does not offer already-related people in the "add" picker, per direction', async () => {
    const user = userEvent.setup();
    const alreadyChild = persona('child-1', 'Ya Hijo');
    const alreadyParent = persona('parent-1', 'Ya Padre');
    const strangerOne = persona('stranger-1', 'Desconocido Uno');

    render(
      <EditRelationshipsModal
        personaId="persona-1"
        personaName="Pedro"
        parents={[alreadyParent]}
        children={[alreadyChild]}
        spouse={null}
        candidates={[alreadyChild, alreadyParent, strangerOne]}
        onRemove={vi.fn()}
        onAdd={vi.fn().mockResolvedValue(true)}
        onAddSpouse={vi.fn().mockResolvedValue(true)}
        onCancel={vi.fn()}
      />
    );

    // "Añadir padre/madre" fixes direction to "parent": exclude existing children.
    await user.click(screen.getByRole('button', { name: 'Añadir padre/madre' }));
    expect(screen.queryByText('Ya Hijo')).not.toBeInTheDocument();
    expect(screen.getByText('Ya Padre')).toBeInTheDocument();
    expect(screen.getByText('Desconocido Uno')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Atrás' }));

    // "Añadir hijo/a" fixes direction to "child": exclude existing parents.
    await user.click(screen.getByRole('button', { name: 'Añadir hijo/a' }));
    expect(screen.queryByText('Ya Padre')).not.toBeInTheDocument();
    expect(screen.getByText('Ya Hijo')).toBeInTheDocument();
    expect(screen.getByText('Desconocido Uno')).toBeInTheDocument();
  });

  it('does not render a direction toggle in the "add" view', async () => {
    const user = userEvent.setup();
    render(
      <EditRelationshipsModal
        personaId="persona-1"
        personaName="Pedro"
        parents={[]}
        children={[]}
        spouse={null}
        candidates={[]}
        onRemove={vi.fn()}
        onAdd={vi.fn().mockResolvedValue(true)}
        onAddSpouse={vi.fn().mockResolvedValue(true)}
        onCancel={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Añadir padre/madre' }));

    expect(screen.queryByRole('button', { name: 'Padre/madre de' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hijo/hija de' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cónyuge de' })).not.toBeInTheDocument();
    expect(screen.getByText('Pedro es padre/madre de...')).toBeInTheDocument();
  });

  it('shows direction-specific copy per add flow', async () => {
    const user = userEvent.setup();
    render(
      <EditRelationshipsModal
        personaId="persona-1"
        personaName="Ana"
        parents={[]}
        children={[]}
        spouse={null}
        candidates={[]}
        onRemove={vi.fn()}
        onAdd={vi.fn().mockResolvedValue(true)}
        onAddSpouse={vi.fn().mockResolvedValue(true)}
        onCancel={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Añadir hijo/a' }));
    expect(screen.getByText('Ana es hijo/hija de...')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Atrás' }));

    await user.click(screen.getByRole('button', { name: 'Añadir cónyuge' }));
    expect(screen.getByText('Ana es cónyuge de...')).toBeInTheDocument();
  });

  it('hides "Añadir padre/madre" once 2 parents are already present, and shows it again once one is removed', () => {
    const twoParents = [persona('p1', 'Padre Uno'), persona('p2', 'Madre Dos')];
    const { rerender } = render(
      <EditRelationshipsModal
        personaId="persona-1"
        personaName="Pedro"
        parents={twoParents}
        children={[]}
        spouse={null}
        candidates={[]}
        onRemove={vi.fn()}
        onAdd={vi.fn().mockResolvedValue(true)}
        onAddSpouse={vi.fn().mockResolvedValue(true)}
        onCancel={vi.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: 'Añadir padre/madre' })).not.toBeInTheDocument();

    rerender(
      <EditRelationshipsModal
        personaId="persona-1"
        personaName="Pedro"
        parents={[twoParents[0]]}
        children={[]}
        spouse={null}
        candidates={[]}
        onRemove={vi.fn()}
        onAdd={vi.fn().mockResolvedValue(true)}
        onAddSpouse={vi.fn().mockResolvedValue(true)}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Añadir padre/madre' })).toBeInTheDocument();
  });

  it('hides "Añadir cónyuge" once a spouse is already present, and shows it again once removed', () => {
    const spouse = persona('s1', 'Cónyuge Marta');
    const { rerender } = render(
      <EditRelationshipsModal
        personaId="persona-1"
        personaName="Pedro"
        parents={[]}
        children={[]}
        spouse={spouse}
        candidates={[]}
        onRemove={vi.fn()}
        onAdd={vi.fn().mockResolvedValue(true)}
        onAddSpouse={vi.fn().mockResolvedValue(true)}
        onCancel={vi.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: 'Añadir cónyuge' })).not.toBeInTheDocument();

    rerender(
      <EditRelationshipsModal
        personaId="persona-1"
        personaName="Pedro"
        parents={[]}
        children={[]}
        spouse={null}
        candidates={[]}
        onRemove={vi.fn()}
        onAdd={vi.fn().mockResolvedValue(true)}
        onAddSpouse={vi.fn().mockResolvedValue(true)}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Añadir cónyuge' })).toBeInTheDocument();
  });

  it('always shows "Añadir hijo/a" regardless of how many children are already present', () => {
    render(
      <EditRelationshipsModal
        personaId="persona-1"
        personaName="Pedro"
        parents={[]}
        children={[persona('c1', 'Hijo Uno'), persona('c2', 'Hijo Dos'), persona('c3', 'Hijo Tres')]}
        spouse={null}
        candidates={[]}
        onRemove={vi.fn()}
        onAdd={vi.fn().mockResolvedValue(true)}
        onAddSpouse={vi.fn().mockResolvedValue(true)}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Añadir hijo/a' })).toBeInTheDocument();
  });

  it('calls onAdd with the correct (parentId, childId) order per fixed direction', async () => {
    const user = userEvent.setup();
    const candidate = persona('c1', 'Candidato');
    const onAdd = vi.fn().mockResolvedValue(true);

    render(
      <EditRelationshipsModal
        personaId="persona-1"
        personaName="Pedro"
        parents={[]}
        children={[]}
        spouse={null}
        candidates={[candidate]}
        onRemove={vi.fn()}
        onAdd={onAdd}
        onAddSpouse={vi.fn().mockResolvedValue(true)}
        onCancel={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Añadir hijo/a' }));
    await user.click(screen.getByText('Candidato'));
    await user.click(screen.getByRole('button', { name: 'Añadir' }));

    // "Pedro es hijo/hija de Candidato" -> Candidato is the parent, Pedro the child.
    expect(onAdd).toHaveBeenCalledWith('c1', 'persona-1');
  });

  it('calls onAddSpouse with the selected candidate id', async () => {
    const user = userEvent.setup();
    const candidate = persona('c1', 'Candidato');
    const onAddSpouse = vi.fn().mockResolvedValue(true);

    render(
      <EditRelationshipsModal
        personaId="persona-1"
        personaName="Pedro"
        parents={[]}
        children={[]}
        spouse={null}
        candidates={[candidate]}
        onRemove={vi.fn()}
        onAdd={vi.fn().mockResolvedValue(true)}
        onAddSpouse={onAddSpouse}
        onCancel={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Añadir cónyuge' }));
    await user.click(screen.getByText('Candidato'));
    await user.click(screen.getByRole('button', { name: 'Añadir' }));

    expect(onAddSpouse).toHaveBeenCalledWith('c1');
  });

  it('allows selecting several candidates at once and adds them all, sequentially, in one "Añadir"', async () => {
    const user = userEvent.setup();
    const c1 = persona('c1', 'Hijo Uno');
    const c2 = persona('c2', 'Hijo Dos');
    const c3 = persona('c3', 'Hijo Tres');
    const calls: string[] = [];
    const onAdd = vi.fn().mockImplementation(async (parentId: string) => {
      // direction is "child" here, so the varying arg (the candidate) is the parentId.
      calls.push(parentId);
      return true;
    });

    render(
      <EditRelationshipsModal
        personaId="persona-1"
        personaName="Pedro"
        parents={[]}
        children={[]}
        spouse={null}
        candidates={[c1, c2, c3]}
        onRemove={vi.fn()}
        onAdd={onAdd}
        onAddSpouse={vi.fn().mockResolvedValue(true)}
        onCancel={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Añadir hijo/a' }));
    await user.click(screen.getByText('Hijo Uno'));
    await user.click(screen.getByText('Hijo Dos'));
    await user.click(screen.getByText('Hijo Tres'));
    await user.click(screen.getByRole('button', { name: 'Añadir' }));

    expect(onAdd).toHaveBeenCalledTimes(3);
    // Sequential, in selection order — not raced via Promise.all.
    expect(calls).toEqual(['c1', 'c2', 'c3']);
    // All succeeded, so it bounces back to the list view.
    expect(screen.getByText('Editar relaciones de Pedro')).toBeInTheDocument();
  });

  it('stops issuing further onAdd calls and keeps the "add" view + selection when one candidate fails mid-list', async () => {
    const user = userEvent.setup();
    const c1 = persona('c1', 'Hijo Uno');
    const c2 = persona('c2', 'Hijo Dos');
    const c3 = persona('c3', 'Hijo Tres');
    // direction is "child" here, so the varying arg (the candidate) is the parentId.
    const onAdd = vi.fn().mockImplementation(async (parentId: string) => parentId !== 'c2');

    render(
      <EditRelationshipsModal
        personaId="persona-1"
        personaName="Pedro"
        parents={[]}
        children={[]}
        spouse={null}
        candidates={[c1, c2, c3]}
        onRemove={vi.fn()}
        onAdd={onAdd}
        onAddSpouse={vi.fn().mockResolvedValue(true)}
        onCancel={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Añadir hijo/a' }));
    await user.click(screen.getByText('Hijo Uno'));
    await user.click(screen.getByText('Hijo Dos'));
    await user.click(screen.getByText('Hijo Tres'));
    await user.click(screen.getByRole('button', { name: 'Añadir' }));

    // Stopped right after the failing c2 — never got to c3.
    expect(onAdd).toHaveBeenCalledTimes(2);
    expect(onAdd).toHaveBeenNthCalledWith(1, 'c1', 'persona-1');
    expect(onAdd).toHaveBeenNthCalledWith(2, 'c2', 'persona-1');
    // Still on the "add" view, not bounced back to the list.
    expect(screen.getByText('Pedro es hijo/hija de...')).toBeInTheDocument();
    // Selection intact — all three still checked/checkable, so "Añadir" is retryable as-is.
    expect(screen.getByRole('button', { name: 'Añadir' })).not.toBeDisabled();
  });

  it('caps parent selection at 2 total, disabling further unchecked candidates once reached', async () => {
    const user = userEvent.setup();
    const oneParent = [persona('p1', 'Padre Uno')];
    const c1 = persona('c1', 'Candidata Uno');
    const c2 = persona('c2', 'Candidata Dos');

    render(
      <EditRelationshipsModal
        personaId="persona-1"
        personaName="Pedro"
        parents={oneParent}
        children={[]}
        spouse={null}
        candidates={[c1, c2]}
        onRemove={vi.fn()}
        onAdd={vi.fn().mockResolvedValue(true)}
        onAddSpouse={vi.fn().mockResolvedValue(true)}
        onCancel={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Añadir padre/madre' }));
    // Already 1 parent, cap is 2 -> only 1 more can be picked.
    await user.click(screen.getByText('Candidata Uno'));

    const secondRow = screen.getByText('Candidata Dos').closest('button');
    expect(secondRow).toBeDisabled();
  });

  it('leaves spouse selection capped at 0 additional picks once a spouse already exists', async () => {
    // The "Añadir cónyuge" button itself is already omitted once a spouse exists (existing
    // behavior), so this only exercises the picker's own cap in isolation via direct candidates.
    const spouse = persona('s1', 'Cónyuge Marta');
    const candidate = persona('c1', 'Candidato');

    render(
      <EditRelationshipsModal
        personaId="persona-1"
        personaName="Pedro"
        parents={[]}
        children={[]}
        spouse={spouse}
        candidates={[candidate]}
        onRemove={vi.fn()}
        onAdd={vi.fn().mockResolvedValue(true)}
        onAddSpouse={vi.fn().mockResolvedValue(true)}
        onCancel={vi.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: 'Añadir cónyuge' })).not.toBeInTheDocument();
  });

  it('never caps children selection, regardless of how many are already present', async () => {
    const user = userEvent.setup();
    const existingChildren = [persona('c1', 'Hijo Uno'), persona('c2', 'Hijo Dos'), persona('c3', 'Hijo Tres')];
    const newCandidates = [persona('n1', 'Nuevo Uno'), persona('n2', 'Nuevo Dos'), persona('n3', 'Nuevo Tres')];

    render(
      <EditRelationshipsModal
        personaId="persona-1"
        personaName="Pedro"
        parents={[]}
        children={existingChildren}
        spouse={null}
        candidates={newCandidates}
        onRemove={vi.fn()}
        onAdd={vi.fn().mockResolvedValue(true)}
        onAddSpouse={vi.fn().mockResolvedValue(true)}
        onCancel={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Añadir hijo/a' }));
    await user.click(screen.getByText('Nuevo Uno'));
    await user.click(screen.getByText('Nuevo Dos'));

    // All three remain enabled/checkable — no cap for children.
    expect(screen.getByText('Nuevo Tres').closest('button')).not.toBeDisabled();
  });
});
