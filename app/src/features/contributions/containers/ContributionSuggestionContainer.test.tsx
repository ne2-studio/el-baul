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

import { setTaggedPersonas, confirmPhotoHasNoPersonas } from '@/features/photos/useCases';
import { addRecuerdo } from '@/features/memories/useCases';

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
