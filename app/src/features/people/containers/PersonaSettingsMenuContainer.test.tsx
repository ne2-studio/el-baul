// @vitest-environment jsdom
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Baul, Persona, PersonaInvite, PersonaRelationship } from '@/types';
import { useBaulesStore } from '@/store/useBaulesStore';
import { usePersonasStore } from '@/store/usePersonasStore';
import { useUIStore } from '@/store/uiStore';
import { PersonaSettingsMenuContainer } from './PersonaSettingsMenuContainer';

vi.mock('@/features/people/useCases', () => ({
  updatePersona: vi.fn(),
  uploadPersonaAvatar: vi.fn(),
  setPersonaAvatarPhoto: vi.fn(),
  updateUserRole: vi.fn(),
  revokeAccess: vi.fn(),
  sharePersonaInvite: vi.fn(),
  addPersonaRelationship: vi.fn(),
  removePersonaRelationship: vi.fn(),
  addPersonaSpouseRelationship: vi.fn(),
  removePersonaSpouseRelationship: vi.fn(),
}));

vi.mock('@/api', () => ({
  api: { photos: { getPage: vi.fn() } },
}));

import {
  addPersonaRelationship,
  removePersonaRelationship,
  addPersonaSpouseRelationship,
  removePersonaSpouseRelationship,
  revokeAccess,
  sharePersonaInvite,
  updatePersona,
  updateUserRole,
} from '@/features/people/useCases';

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
    usePersonasStore.setState({
      personas: {}, removalRequests: {}, personaPhotos: {}, taggedPersonas: {}, relationships: {}, spouseRelationships: {},
    });
    useUIStore.setState({ showToast: false, toastMessage: '' });
    vi.clearAllMocks();
  });

  it('renders nothing for a viewer with no baúl membership at all', () => {
    useBaulesStore.setState({ baules: [] });
    render(
      <MemoryRouter>
        <PersonaSettingsMenuContainer baulId={baulId} persona={persona({ canEdit: false })} />
      </MemoryRouter>
    );

    expect(screen.queryByRole('button', { name: 'Opciones de la persona' })).not.toBeInTheDocument();
  });

  // A colaborador can't edit another persona's info/avatar nor manage their access, but family
  // relationships are open to any member — see roleUtils.getPersonaPermissions.
  it('shows only "Editar relaciones" for a non-admin viewer of a non-editable persona', async () => {
    const user = userEvent.setup();
    renderContainer(persona({ canEdit: false }), 'colaborador');

    await user.click(screen.getByRole('button', { name: 'Opciones de la persona' }));

    expect(screen.getByText('Editar relaciones')).toBeInTheDocument();
    expect(screen.queryByText('Editar información')).not.toBeInTheDocument();
    expect(screen.queryByText('Cambiar foto de perfil')).not.toBeInTheDocument();
    expect(screen.queryByText('Gestionar permisos')).not.toBeInTheDocument();
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

  it('changes the role and shows a success toast on submit', async () => {
    const user = userEvent.setup();
    vi.mocked(updateUserRole).mockResolvedValue(undefined);

    renderContainer(persona({ role: 'colaborador' }));
    await user.click(screen.getByRole('button', { name: 'Opciones de la persona' }));
    await user.click(await screen.findByText('Gestionar permisos'));
    await user.selectOptions(await screen.findByRole('combobox'), 'administrador');
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    expect(updateUserRole).toHaveBeenCalledWith(baulId, 'p1', 'administrador');
    await waitFor(() => expect(screen.queryByText('Gestionar permisos')).not.toBeInTheDocument());
    expect(useUIStore.getState().toastMessage).toBe('Rol actualizado');
  });

  it('hides manage-access actions for a custodio persona', async () => {
    const user = userEvent.setup();
    renderContainer(persona({ isCustodio: true }));

    await user.click(screen.getByRole('button', { name: 'Opciones de la persona' }));

    expect(screen.queryByText('Revocar acceso')).not.toBeInTheDocument();
    expect(screen.queryByText('Gestionar permisos')).not.toBeInTheDocument();
  });

  it('does not render two adjacent separators for a pending persona', async () => {
    const user = userEvent.setup();
    renderContainer(persona({ status: 'pending' }));

    await user.click(screen.getByRole('button', { name: 'Opciones de la persona' }));

    // A pending persona can still have its access level managed and be invited, but there is
    // nothing to revoke yet ("Revocar acceso" needs a claimed account) — so only one separator
    // should render, between the info group and the access group.
    expect(screen.queryByText('Gestionar permisos')).toBeInTheDocument();
    expect(screen.queryByText('Enviar invitación')).toBeInTheDocument();
    expect(screen.queryByText('Revocar acceso')).not.toBeInTheDocument();
    expect(document.querySelectorAll('[data-slot="dropdown-menu-separator"]')).toHaveLength(1);
  });

  it('sends an invitation for a pending, invitable persona', async () => {
    const user = userEvent.setup();
    vi.mocked(sharePersonaInvite).mockResolvedValue(
      new PersonaInvite({ token: 'tok', url: 'https://api.el-baul.test/invitacion/baul/tok' })
    );

    renderContainer(persona({ status: 'pending', role: 'colaborador' }));
    await user.click(screen.getByRole('button', { name: 'Opciones de la persona' }));
    await user.click(await screen.findByText('Enviar invitación'));

    expect(sharePersonaInvite).toHaveBeenCalledWith(
      expect.objectContaining({ id: baulId }),
      expect.objectContaining({ id: 'p1' }),
      expect.any(Function)
    );
  });

  it('never offers "Enviar invitación" for a persona with no access', async () => {
    const user = userEvent.setup();
    renderContainer(persona({ status: 'pending', role: 'sin_acceso' }));

    await user.click(screen.getByRole('button', { name: 'Opciones de la persona' }));

    expect(screen.queryByText('Enviar invitación')).not.toBeInTheDocument();
  });

  it('adds a relationship as parent from the "Editar relaciones" flow', async () => {
    const user = userEvent.setup();
    const other = persona({ id: 'p2', nickname: 'Nieto Pablo' });
    usePersonasStore.setState({ personas: { [baulId]: [persona(), other] } });
    vi.mocked(addPersonaRelationship).mockResolvedValue({ parentId: 'p1', childId: 'p2' } as PersonaRelationship);

    renderContainer(persona());
    await user.click(screen.getByRole('button', { name: 'Opciones de la persona' }));
    await user.click(await screen.findByText('Editar relaciones'));

    await user.click(screen.getByRole('button', { name: 'Añadir padre/madre' }));
    await user.click(screen.getByText('Nieto Pablo'));
    await user.click(screen.getByRole('button', { name: 'Añadir' }));

    // "Añadir padre/madre" fixes direction to "parent" — the persona whose ficha this is (p1)
    // becomes the parent of the picked candidate (p2).
    expect(addPersonaRelationship).toHaveBeenCalledWith(baulId, 'p1', 'p2');
  });

  it('removes a relationship from the "Editar relaciones" list', async () => {
    const user = userEvent.setup();
    const child = persona({ id: 'p2', nickname: 'Nieta Vero' });
    usePersonasStore.setState({
      personas: { [baulId]: [persona(), child] },
      relationships: { [baulId]: [{ parentId: 'p1', childId: 'p2' } as PersonaRelationship] },
    });
    vi.mocked(removePersonaRelationship).mockResolvedValue(undefined);

    renderContainer(persona());
    await user.click(screen.getByRole('button', { name: 'Opciones de la persona' }));
    await user.click(await screen.findByText('Editar relaciones'));

    expect(screen.getByText('Nieta Vero')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Eliminar relación con Nieta Vero' }));

    expect(removePersonaRelationship).toHaveBeenCalledWith(baulId, 'p1', 'p2');
  });

  it('adds a spouse relationship from the "Editar relaciones" flow', async () => {
    const user = userEvent.setup();
    const other = persona({ id: 'p2', nickname: 'Cónyuge Marta' });
    usePersonasStore.setState({ personas: { [baulId]: [persona(), other] } });
    vi.mocked(addPersonaSpouseRelationship).mockResolvedValue({ personaId1: 'p1', personaId2: 'p2' } as never);

    renderContainer(persona());
    await user.click(screen.getByRole('button', { name: 'Opciones de la persona' }));
    await user.click(await screen.findByText('Editar relaciones'));

    await user.click(screen.getByRole('button', { name: 'Añadir cónyuge' }));
    await user.click(screen.getByText('Cónyuge Marta'));
    await user.click(screen.getByRole('button', { name: 'Añadir' }));

    expect(addPersonaSpouseRelationship).toHaveBeenCalledWith(baulId, 'p1', 'p2');
  });

  it('removes a spouse relationship from the "Editar relaciones" list', async () => {
    const user = userEvent.setup();
    const spouse = persona({ id: 'p2', nickname: 'Cónyuge Marta' });
    usePersonasStore.setState({
      personas: { [baulId]: [persona(), spouse] },
      spouseRelationships: { [baulId]: [{ personaId1: 'p1', personaId2: 'p2' } as never] },
    });
    vi.mocked(removePersonaSpouseRelationship).mockResolvedValue(undefined);

    renderContainer(persona());
    await user.click(screen.getByRole('button', { name: 'Opciones de la persona' }));
    await user.click(await screen.findByText('Editar relaciones'));

    expect(screen.getByText('Cónyuge Marta')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Eliminar relación con Cónyuge Marta' }));

    expect(removePersonaSpouseRelationship).toHaveBeenCalledWith(baulId, 'p1', 'p2');
  });

  it('hides "Añadir cónyuge" once the persona already has a spouse', async () => {
    const user = userEvent.setup();
    const spouse = persona({ id: 'p2', nickname: 'Cónyuge Marta' });
    const other = persona({ id: 'p3', nickname: 'Amigo Luis' });
    usePersonasStore.setState({
      personas: { [baulId]: [persona(), spouse, other] },
      spouseRelationships: { [baulId]: [{ personaId1: 'p1', personaId2: 'p2' } as never] },
    });

    renderContainer(persona());
    await user.click(screen.getByRole('button', { name: 'Opciones de la persona' }));
    await user.click(await screen.findByText('Editar relaciones'));

    expect(screen.queryByRole('button', { name: 'Añadir cónyuge' })).not.toBeInTheDocument();
  });
});
