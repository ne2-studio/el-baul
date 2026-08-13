// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Recuerdo } from '@/types';
import { useUIStore } from '@/store/uiStore';

vi.mock('@/api', () => ({
  api: { recuerdos: { createShareLink: vi.fn() } },
  isForbiddenError: () => false,
  isUnauthorizedError: () => false,
}));

vi.mock('@/features/memories/useCases', () => ({
  editRecuerdo: vi.fn(),
}));

vi.mock('@/features/sharing/sharePublicLink', () => ({
  sharePublicLink: vi.fn(),
}));

import { api } from '@/api';
import { editRecuerdo } from '@/features/memories/useCases';
import { sharePublicLink } from '@/features/sharing/sharePublicLink';
import { useRecuerdoActions } from './useRecuerdoActions';

const recuerdo = { id: 'r1', text: 'Un buen día' } as Recuerdo;

describe('useRecuerdoActions', () => {
  beforeEach(() => {
    useUIStore.setState({ showToast: false, toastMessage: '' });
    vi.clearAllMocks();
    // The hook logs the caught error to console.error before toasting — silence the noise.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('editRecuerdo calls the use case and returns true on success', async () => {
    vi.mocked(editRecuerdo).mockResolvedValue(undefined);
    const { result } = renderHook(() => useRecuerdoActions('Familia García'));

    let ok: boolean = false;
    await act(async () => {
      ok = await result.current.editRecuerdo(recuerdo, 'Texto nuevo');
    });

    expect(editRecuerdo).toHaveBeenCalledWith('r1', 'Texto nuevo');
    expect(ok).toBe(true);
  });

  it('editRecuerdo returns false and toasts on failure', async () => {
    vi.mocked(editRecuerdo).mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useRecuerdoActions('Familia García'));

    let ok: boolean = true;
    await act(async () => {
      ok = await result.current.editRecuerdo(recuerdo, 'Texto nuevo');
    });

    expect(ok).toBe(false);
    expect(useUIStore.getState().toastMessage).toBe('Error al guardar el recuerdo');
  });

  it('shareRecuerdo creates a share link and shares it with the baúl name in the message', async () => {
    vi.mocked(api.recuerdos.createShareLink).mockResolvedValue({ url: 'https://el-baul.app/r/r1', token: 'tok' });
    const { result } = renderHook(() => useRecuerdoActions('Familia García'));

    await act(async () => {
      await result.current.shareRecuerdo(recuerdo);
    });

    expect(api.recuerdos.createShareLink).toHaveBeenCalledWith('r1');
    expect(sharePublicLink).toHaveBeenCalledWith({
      title: 'Recuerdo de Familia García',
      text: 'Te comparto un recuerdo de "Familia García" en El Baúl.',
      url: 'https://el-baul.app/r/r1',
      onCopied: expect.any(Function),
    });
  });

  it('shareRecuerdo toasts and does not call sharePublicLink when the link creation fails', async () => {
    vi.mocked(api.recuerdos.createShareLink).mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useRecuerdoActions('Familia García'));

    await act(async () => {
      await result.current.shareRecuerdo(recuerdo);
    });

    expect(sharePublicLink).not.toHaveBeenCalled();
    await waitFor(() => expect(useUIStore.getState().toastMessage).toBe('Error al crear el enlace'));
  });
});
