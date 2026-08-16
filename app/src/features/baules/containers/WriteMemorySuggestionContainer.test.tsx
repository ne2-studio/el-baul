// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Photo } from '@/types';
import { useUIStore } from '@/store/uiStore';
import { WriteMemorySuggestionContainer } from './WriteMemorySuggestionContainer';

vi.mock('@/features/memories/useCases', () => ({
  addRecuerdo: vi.fn(),
}));

import { addRecuerdo } from '@/features/memories/useCases';

// jsdom no implementa ResizeObserver — ver mismo stub en ContributionSuggestionContainer.test.tsx.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub);

const baulId = 'baul-1';

function photo(overrides: Partial<Photo> = {}): Photo {
  return { id: 'photo-1', thumbnailUrl: '/thumb.jpg', fullUrl: '/full.jpg', recuerdoCount: 0, ...overrides } as Photo;
}

describe('WriteMemorySuggestionContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUIStore.setState({ showToast: false, toastMessage: '' });
  });

  // La foto candidata ya llega resuelta por ContributionSuggestionGateContainer — ver ese test
  // para los casos de "sin candidata"/"fetch falla", que ya no aplican aquí.
  it('shows the candidate photo and the memory input', () => {
    render(<WriteMemorySuggestionContainer baulId={baulId} photo={photo()} onResolved={vi.fn()} />);

    expect(screen.getByText('¿Nos ayudas con esta foto?')).toBeInTheDocument();
  });

  it('saves the written memory and resolves on submit', async () => {
    const user = userEvent.setup();
    vi.mocked(addRecuerdo).mockResolvedValue(undefined);
    const onResolved = vi.fn();

    render(<WriteMemorySuggestionContainer baulId={baulId} photo={photo()} onResolved={onResolved} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'Fue un día precioso');
    await user.click(screen.getByRole('button', { name: 'Enviar recuerdo' }));

    await waitFor(() => expect(addRecuerdo).toHaveBeenCalledWith(baulId, 'photo-1', 'Fue un día precioso'));
    expect(onResolved).toHaveBeenCalledTimes(1);
    expect(useUIStore.getState().toastMessage).toBe('Gracias por ayudar a recordar. Tu familia te lo agradece');
  });

  it('resolves on "Ahora no" without saving anything', async () => {
    const user = userEvent.setup();
    const onResolved = vi.fn();

    render(<WriteMemorySuggestionContainer baulId={baulId} photo={photo()} onResolved={onResolved} />);

    await user.click(screen.getByText('Ahora no →'));

    expect(addRecuerdo).not.toHaveBeenCalled();
    expect(onResolved).toHaveBeenCalledTimes(1);
  });
});
