// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFileInputSelection } from './useFileInputSelection';

vi.mock('@/features/photos/uploadFlow', () => ({
  materializeFileList: vi.fn(),
}));

import { materializeFileList } from '@/features/photos/uploadFlow';

function inputChangeEvent(files: File[]) {
  const target = { files, value: 'x' } as unknown as HTMLInputElement;
  return { target } as unknown as React.ChangeEvent<HTMLInputElement>;
}

describe('useFileInputSelection loading state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports loading true while materializing files, then false once selection finishes', async () => {
    const onSelected = vi.fn();
    const onLoadingChange = vi.fn();
    let resolveMaterialize!: (v: { selectedPhotos: unknown[]; droppedCount: number }) => void;
    vi.mocked(materializeFileList).mockReturnValue(
      new Promise((resolve) => {
        resolveMaterialize = resolve as typeof resolveMaterialize;
      })
    );

    const { result } = renderHook(() => useFileInputSelection(onSelected, undefined, onLoadingChange));
    const file = new File(['x'], 'foto.jpg', { type: 'image/jpeg' });
    const handlePromise = result.current(inputChangeEvent([file]));

    expect(onLoadingChange).toHaveBeenCalledWith(true);
    expect(onSelected).not.toHaveBeenCalled();

    resolveMaterialize({ selectedPhotos: [{ id: '1', file, preview: 'blob:preview' }], droppedCount: 0 });
    await handlePromise;

    expect(onSelected).toHaveBeenCalledWith([{ id: '1', file, preview: 'blob:preview' }]);
    expect(onLoadingChange).toHaveBeenCalledWith(false);
    expect(onLoadingChange.mock.calls.map((c) => c[0])).toEqual([true, false]);
  });

  it('still reports loading false when materializing fails, and does not swallow the error', async () => {
    const onSelected = vi.fn();
    const onLoadingChange = vi.fn();
    const error = new Error('boom');
    vi.mocked(materializeFileList).mockRejectedValue(error);

    const { result } = renderHook(() => useFileInputSelection(onSelected, undefined, onLoadingChange));
    const file = new File(['x'], 'foto.jpg', { type: 'image/jpeg' });

    await expect(result.current(inputChangeEvent([file]))).rejects.toThrow('boom');

    expect(onLoadingChange.mock.calls.map((c) => c[0])).toEqual([true, false]);
  });
});
