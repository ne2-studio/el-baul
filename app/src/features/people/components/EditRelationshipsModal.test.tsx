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

    await user.click(screen.getByRole('button', { name: 'Añadir relación' }));

    // Default direction is "parent" (Padre/madre de): exclude existing children.
    expect(screen.queryByText('Ya Hijo')).not.toBeInTheDocument();
    expect(screen.getByText('Ya Padre')).toBeInTheDocument();
    expect(screen.getByText('Desconocido Uno')).toBeInTheDocument();

    // Switch to "child" direction (Hijo/hija de): exclude existing parents.
    await user.click(screen.getByRole('button', { name: 'Hijo/hija de' }));
    expect(screen.queryByText('Ya Padre')).not.toBeInTheDocument();
    expect(screen.getByText('Ya Hijo')).toBeInTheDocument();
    expect(screen.getByText('Desconocido Uno')).toBeInTheDocument();
  });
});
