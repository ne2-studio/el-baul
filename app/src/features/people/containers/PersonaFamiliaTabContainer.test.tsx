// @vitest-environment jsdom
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Persona } from '@/types';
import { usePersonasStore } from '@/store/usePersonasStore';
import { PersonaFamiliaTabContainer } from './PersonaFamiliaTabContainer';

const baulId = 'baul-1';
const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

function persona(id: string, nickname = id): Persona {
  return { id, baulId, nickname, status: 'active', role: 'colaborador', invitedDate: '' } as Persona;
}

function renderContainer(personaId: string) {
  return render(
    <MemoryRouter>
      <PersonaFamiliaTabContainer baulId={baulId} personaId={personaId} />
    </MemoryRouter>
  );
}

describe('PersonaFamiliaTabContainer', () => {
  beforeEach(() => {
    usePersonasStore.setState({ personas: {}, removalRequests: {}, personaPhotos: {}, taggedPersonas: {}, relationships: {} });
    navigateMock.mockClear();
  });

  it('shows the empty state when the persona has no relationships', () => {
    usePersonasStore.setState({ personas: { [baulId]: [persona('sara')] }, relationships: { [baulId]: [] } });

    renderContainer('sara');

    expect(screen.getByText('Todavía no hay relaciones familiares')).toBeInTheDocument();
  });

  it("renders only the persona's own branch of the family tree, not unrelated families in the baúl", () => {
    const abuela = persona('abuela', 'Abuela');
    const gloria = persona('gloria', 'Tita Gloria');
    const otroA = persona('otro-a', 'Otro A');
    const otroB = persona('otro-b', 'Otro B');
    usePersonasStore.setState({
      personas: { [baulId]: [abuela, gloria, otroA, otroB] },
      relationships: {
        [baulId]: [
          { parentId: 'abuela', childId: 'gloria' },
          { parentId: 'otro-a', childId: 'otro-b' },
        ] as never,
      },
    });

    renderContainer('gloria');

    expect(screen.getByText('Abuela')).toBeInTheDocument();
    expect(screen.getByText('Tita Gloria')).toBeInTheDocument();
    expect(screen.queryByText('Otro A')).not.toBeInTheDocument();
    expect(screen.queryByText('Otro B')).not.toBeInTheDocument();
  });

  it('navigates to the clicked relative\'s own ficha', async () => {
    const user = userEvent.setup();
    usePersonasStore.setState({
      personas: { [baulId]: [persona('abuela', 'Abuela'), persona('gloria', 'Tita Gloria')] },
      relationships: { [baulId]: [{ parentId: 'abuela', childId: 'gloria' }] as never },
    });

    renderContainer('gloria');
    await user.click(screen.getByText('Abuela'));

    expect(navigateMock).toHaveBeenCalledWith(`/baules/${baulId}/personas/abuela`, { state: { returnTab: 'personas' } });
  });
});
