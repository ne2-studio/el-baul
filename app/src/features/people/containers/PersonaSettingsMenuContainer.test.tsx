// @vitest-environment jsdom
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Baul, Persona } from '@/types';
import { useBaulesStore } from '@/store/useBaulesStore';
import { usePersonasStore } from '@/store/usePersonasStore';
import { PersonaSettingsMenuContainer } from './PersonaSettingsMenuContainer';

vi.mock('@/features/people/useCases', () => ({
  updatePersona: vi.fn(),
  uploadPersonaAvatar: vi.fn(),
  setPersonaAvatarPhoto: vi.fn(),
  updateUserRole: vi.fn(),
  revokeAccess: vi.fn(),
}));

vi.mock('@/api', () => ({
  api: { photos: { getPage: vi.fn() } },
}));

import { revokeAccess, updatePersona } from '@/features/people/useCases';

const baulId = 'baul-1';

function baul(role: Baul['role']): Baul {
  return { id: baulId, name: 'Familia García', chapterCount: 1, role } as Baul;
}

function persona(overrides: Partial<Persona> = {}): Persona {
  return {
    id: 'p1', baulId, name: 'Rosa García', nickname: 'Abuela Rosa', status: 'active', role: 'colaborador',
    invitedDate: 'hace 1 año', canEdit: true, ...overrides,
  } as Persona;
}

function renderContainer(p: Persona, currentBaulRole: Baul['role'] = 'administrador') {
  useBaulesStore.setState({ baules: [baul(currentBaulRole)] });
  return render(
    <MemoryRouter>
      <PersonaSettingsMenuContainer baulId={baulId} persona={p} />
    </MemoryRouter>
  );
}

describe('PersonaSettingsMenuContainer', () => {
  beforeEach(() => {
    usePersonasStore.setState({ personas: {}, removalRequests: {}, personaPhotos: {}, taggedPersonas: {} });
    vi.clearAllMocks();
  });

  it('renders nothing for a non-admin viewer of a non-editable persona', () => {
    renderContainer(persona({ canEdit: false }), 'colaborador');

    expect(screen.queryByRole('button', { name: 'Opciones de la persona' })).not.toBeInTheDocument();
  });

  it('shows the menu trigger when the viewer can manage the persona', () => {
    renderContainer(persona());

    expect(screen.getByRole('button', { name: 'Opciones de la persona' })).toBeInTheDocument();
  });

  it('edits the persona info and closes the modal on success', async () => {
    const user = userEvent.setup();
    vi.mocked(updatePersona).mockResolvedValue(undefined);

    renderContainer(persona());
    await user.click(screen.getByRole('button', { name: 'Opciones de la persona' }));
    await user.click(await screen.findByText('Editar información'));
    const nicknameInput = await screen.findByDisplayValue('Abuela Rosa');
    await user.clear(nicknameInput);
    await user.type(nicknameInput, 'Abuela');
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    expect(updatePersona).toHaveBeenCalledWith(baulId, 'p1', 'Rosa García', 'Abuela');
    await waitFor(() => expect(screen.queryByDisplayValue('Abuela')).not.toBeInTheDocument());
  });

  it('revokes access and closes the modal on success', async () => {
    const user = userEvent.setup();
    vi.mocked(revokeAccess).mockResolvedValue(undefined);

    renderContainer(persona());
    await user.click(screen.getByRole('button', { name: 'Opciones de la persona' }));
    await user.click(await screen.findByText('Revocar acceso'));
    await user.click(screen.getByRole('button', { name: /^revocar acceso$/i }));

    expect(revokeAccess).toHaveBeenCalledWith(baulId, 'p1');
    await waitFor(() => expect(screen.queryByText('¿Revocar el acceso?')).not.toBeInTheDocument());
  });

  it('hides manage-access actions for a custodio persona', async () => {
    const user = userEvent.setup();
    renderContainer(persona({ role: 'custodio' }));

    await user.click(screen.getByRole('button', { name: 'Opciones de la persona' }));

    expect(screen.queryByText('Revocar acceso')).not.toBeInTheDocument();
    expect(screen.queryByText('Gestionar acceso')).not.toBeInTheDocument();
  });
});
