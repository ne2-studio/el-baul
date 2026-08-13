// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Photo } from '@/types';
import { useUIStore } from '@/store/uiStore';
import { WriteMemorySuggestionContainer } from './WriteMemorySuggestionContainer';

vi.mock('@/api', () => ({
  api: { photos: { getMemorySuggestion: vi.fn() } },
}));
vi.mock('@/features/memories/useCases', () => ({
  addRecuerdo: vi.fn(),
}));

import { api } from '@/api';
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

  it('resolves immediately without rendering anything when there is no candidate photo', async () => {
    vi.mocked(api.photos.getMemorySuggestion).mockResolvedValue(null);
    const onResolved = vi.fn();

    const { container } = render(<WriteMemorySuggestionContainer baulId={baulId} onResolved={onResolved} />);

    await waitFor(() => expect(onResolved).toHaveBeenCalledTimes(1));
    expect(container).toBeEmptyDOMElement();
  });

  it('resolves without rendering anything when the suggestion fetch fails', async () => {
    vi.mocked(api.photos.getMemorySuggestion).mockRejectedValue(new Error('network error'));
    const onResolved = vi.fn();

    render(<WriteMemorySuggestionContainer baulId={baulId} onResolved={onResolved} />);

    await waitFor(() => expect(onResolved).toHaveBeenCalledTimes(1));
  });

  it('shows the candidate photo and the memory input', async () => {
    vi.mocked(api.photos.getMemorySuggestion).mockResolvedValue(photo());

    render(<WriteMemorySuggestionContainer baulId={baulId} onResolved={vi.fn()} />);

    expect(await screen.findByText('¿Nos ayudas con esta foto?')).toBeInTheDocument();
  });

  it('saves the written memory and resolves on submit', async () => {
    const user = userEvent.setup();
    vi.mocked(api.photos.getMemorySuggestion).mockResolvedValue(photo());
    vi.mocked(addRecuerdo).mockResolvedValue(undefined);
    const onResolved = vi.fn();

    render(<WriteMemorySuggestionContainer baulId={baulId} onResolved={onResolved} />);
    await screen.findByText('¿Nos ayudas con esta foto?');

    const input = screen.getByRole('textbox');
    await user.type(input, 'Fue un día precioso');
    await user.click(screen.getByRole('button', { name: 'Enviar recuerdo' }));

    await waitFor(() => expect(addRecuerdo).toHaveBeenCalledWith(baulId, 'photo-1', 'Fue un día precioso'));
    expect(onResolved).toHaveBeenCalledTimes(1);
    expect(useUIStore.getState().toastMessage).toBe('Gracias por ayudar a recordar. Tu familia te lo agradece');
  });

  it('resolves on "Ahora no" without saving anything', async () => {
    const user = userEvent.setup();
    vi.mocked(api.photos.getMemorySuggestion).mockResolvedValue(photo());
    const onResolved = vi.fn();

    render(<WriteMemorySuggestionContainer baulId={baulId} onResolved={onResolved} />);
    await screen.findByText('¿Nos ayudas con esta foto?');

    await user.click(screen.getByText('Ahora no →'));

    expect(addRecuerdo).not.toHaveBeenCalled();
    expect(onResolved).toHaveBeenCalledTimes(1);
  });
});
