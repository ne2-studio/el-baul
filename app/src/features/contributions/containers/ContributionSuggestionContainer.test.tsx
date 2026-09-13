// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Persona, Photo } from '@/types';
import { usePersonasStore } from '@/store/usePersonasStore';
import { useUIStore } from '@/store/uiStore';
import { ContributionSuggestionContainer } from './ContributionSuggestionContainer';

vi.mock('@/features/photos/useCases', () => ({
  setTaggedPersonas: vi.fn(),
  confirmPhotoHasNoPersonas: vi.fn(),
}));
vi.mock('@/features/memories/useCases', () => ({
  addRecuerdo: vi.fn(),
}));
vi.mock('@/features/people/useCases', () => ({
  createPersona: vi.fn(),
}));

import { setTaggedPersonas, confirmPhotoHasNoPersonas } from '@/features/photos/useCases';
import { addRecuerdo } from '@/features/memories/useCases';
import { createPersona } from '@/features/people/useCases';

// jsdom no implementa ResizeObserver — lo usa useElementHeight (vía PageHeader) para medir el
// offset del que depende el sticky de la foto. Sin este stub, montar la pantalla real revienta
// con "ResizeObserver is not defined", ver mismo stub en BaulChapterReturnTab.test.tsx.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub);

const baulId = 'baul-1';

function persona(overrides: Partial<Persona> = {}): Persona {
  return { id: 'p1', baulId, nickname: 'Abuela', status: 'active', role: 'colaborador', invitedDate: '', ...overrides } as Persona;
}

function photo(overrides: Partial<Photo> = {}): Photo {
  return { id: 'photo-1', thumbnailUrl: '/thumb.jpg', fullUrl: '/full.jpg', recuerdoCount: 0, ...overrides } as Photo;
}

describe('ContributionSuggestionContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePersonasStore.getState().reset();
    usePersonasStore.setState({ personas: { [baulId]: [persona()] } });
    useUIStore.setState({ showToast: false, toastMessage: '' });
  });

  // La foto candidata ya llega resuelta por ContributionSuggestionGateContainer — ver ese test
  // para los casos de "sin candidata"/"fetch falla", que ya no aplican aquí.
  it('shows the candidate photo and its persona selector, Guardar disabled with nothing selected', () => {
    render(<ContributionSuggestionContainer baulId={baulId} photo={photo()} onResolved={vi.fn()} />);

    expect(screen.getByText('¿Nos ayudas con esta foto?')).toBeInTheDocument();
    expect(screen.getByText('Abuela')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
  });

  it('saves the selected personas and resolves on Guardar', async () => {
    const user = userEvent.setup();
    vi.mocked(setTaggedPersonas).mockResolvedValue(undefined);
    const onResolved = vi.fn();

    render(<ContributionSuggestionContainer baulId={baulId} photo={photo()} onResolved={onResolved} />);

    await user.click(screen.getByText('Abuela'));
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(setTaggedPersonas).toHaveBeenCalledWith('photo-1', ['p1']));
    expect(onResolved).toHaveBeenCalledTimes(1);
    expect(useUIStore.getState().toastMessage).toBe('Gracias por ayudar a recordar. Tu familia te lo agradece');
  });

  // Alternativa 1d del selector: crear una persona nueva sin salir de la pantalla, escribiendo
  // un nombre sin coincidencia en el buscador.
  it('creates and tags a new persona typed in the picker search', async () => {
    const user = userEvent.setup();
    vi.mocked(setTaggedPersonas).mockResolvedValue(undefined);
    // El mock reproduce la escritura en el store que hace el createPersona real, ya que
    // ContributionSuggestionScreen renderiza a partir de personas[baulId] del store.
    vi.mocked(createPersona).mockImplementation(async (bId, nickname) => {
      const created = persona({ id: 'p2', nickname });
      usePersonasStore.setState((state) => ({
        personas: { ...state.personas, [bId]: [...(state.personas[bId] || []), created] },
      }));
      return created;
    });
    const onResolved = vi.fn();

    render(<ContributionSuggestionContainer baulId={baulId} photo={photo()} onResolved={onResolved} />);

    await user.type(screen.getByLabelText('Buscar persona'), 'Tío Juan');
    await user.click(screen.getByRole('button', { name: /Crear y etiquetar "Tío Juan"/ }));

    expect(createPersona).toHaveBeenCalledWith(baulId, 'Tío Juan');
    expect(await screen.findByRole('button', { name: 'Quitar a Tío Juan' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(setTaggedPersonas).toHaveBeenCalledWith('photo-1', ['p2']));
  });

  // Issue #52: el botón primario "Guardar" debe ir antes (arriba) que el ghost "No hay nadie
  // en esta foto", igual que en el resto de pantallas que apilan primario + ghost.
  it('renders Guardar before "No hay nadie en esta foto" in the footer', () => {
    render(<ContributionSuggestionContainer baulId={baulId} photo={photo()} onResolved={vi.fn()} />);

    const buttons = screen.getAllByRole('button').map((button) => button.textContent);
    const guardarIndex = buttons.findIndex((text) => text === 'Guardar');
    const noHayNadieIndex = buttons.findIndex((text) => text === 'No hay nadie en esta foto');

    expect(guardarIndex).toBeGreaterThanOrEqual(0);
    expect(noHayNadieIndex).toBeGreaterThanOrEqual(0);
    expect(guardarIndex).toBeLessThan(noHayNadieIndex);
  });

  it('resolves on "Ahora no" without saving anything', async () => {
    const user = userEvent.setup();
    const onResolved = vi.fn();

    render(<ContributionSuggestionContainer baulId={baulId} photo={photo()} onResolved={onResolved} />);

    await user.click(screen.getByText('Ahora no →'));

    expect(setTaggedPersonas).not.toHaveBeenCalled();
    expect(onResolved).toHaveBeenCalledTimes(1);
  });

  // Issue #29: en vez de simplemente cerrar la sugerencia, "no hay nadie en esta foto" la
  // reconvierte en la sugerencia hermana "escribe un recuerdo" sobre la misma foto — la app no
  // se queda sin preguntar nada.
  it('confirms no personas and converts into the "write a memory" fallback instead of resolving', async () => {
    const user = userEvent.setup();
    vi.mocked(confirmPhotoHasNoPersonas).mockResolvedValue(undefined);
    const onResolved = vi.fn();

    render(<ContributionSuggestionContainer baulId={baulId} photo={photo()} onResolved={onResolved} />);

    await user.click(screen.getByText('No hay nadie en esta foto'));

    await waitFor(() => expect(confirmPhotoHasNoPersonas).toHaveBeenCalledWith('photo-1'));
    expect(onResolved).not.toHaveBeenCalled();
    expect(await screen.findByText('Describe la foto o cuéntanos por qué es importante')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  // Issue #50: si la foto ya tiene recuerdos, no tiene sentido reconvertir la sugerencia en
  // "escribe un recuerdo" — cerramos directamente, igual que "Ahora no".
  it('resolves directly instead of showing the memory fallback when the photo already has recuerdos', async () => {
    const user = userEvent.setup();
    vi.mocked(confirmPhotoHasNoPersonas).mockResolvedValue(undefined);
    const onResolved = vi.fn();

    const { container } = render(
      <ContributionSuggestionContainer baulId={baulId} photo={photo({ recuerdoCount: 2 })} onResolved={onResolved} />,
    );

    await user.click(screen.getByText('No hay nadie en esta foto'));

    await waitFor(() => expect(confirmPhotoHasNoPersonas).toHaveBeenCalledWith('photo-1'));
    await waitFor(() => expect(onResolved).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('Describe la foto o cuéntanos por qué es importante')).not.toBeInTheDocument();
    // El textarea del recuerdo, no el buscador del selector de personas (también un
    // "textbox", pero siempre presente en esta pantalla).
    expect(container.querySelector('textarea')).not.toBeInTheDocument();
  });

  it('saves the memory written in the fallback screen and resolves on submit', async () => {
    const user = userEvent.setup();
    vi.mocked(confirmPhotoHasNoPersonas).mockResolvedValue(undefined);
    vi.mocked(addRecuerdo).mockResolvedValue(undefined);
    const onResolved = vi.fn();

    render(<ContributionSuggestionContainer baulId={baulId} photo={photo()} onResolved={onResolved} />);

    await user.click(screen.getByText('No hay nadie en esta foto'));
    const input = await screen.findByRole('textbox');
    await user.type(input, 'Fue un día precioso');
    await user.click(screen.getByRole('button', { name: 'Enviar recuerdo' }));

    await waitFor(() => expect(addRecuerdo).toHaveBeenCalledWith(baulId, 'photo-1', 'Fue un día precioso'));
    expect(onResolved).toHaveBeenCalledTimes(1);
  });
});
