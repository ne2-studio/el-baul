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
});
