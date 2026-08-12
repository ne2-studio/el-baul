// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Photo } from '@/types';
import { CoverPhotoPickerModal } from './CoverPhotoPickerModal';

function makePhotos(prefix: string, count: number): Photo[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i}`,
    thumbnailUrl: `/${prefix}-${i}-thumb.jpg`,
    fullUrl: `/${prefix}-${i}.jpg`,
    recuerdoCount: 0,
  }));
}

let triggerIntersection: (isIntersecting: boolean) => void = () => {};

beforeEach(() => {
  class TestIntersectionObserver {
    constructor(callback: IntersectionObserverCallback) {
      triggerIntersection = (isIntersecting: boolean) =>
        callback([{ isIntersecting } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
    }
    observe = vi.fn();
    disconnect = vi.fn();
  }
  vi.stubGlobal('IntersectionObserver', TestIntersectionObserver);
});

describe('CoverPhotoPickerModal pagination', () => {
  it('loads the first page on mount and fetches the next one only once the sentinel intersects', async () => {
    const firstPage = makePhotos('a', 2);
    const secondPage = makePhotos('b', 2);
    const fetchPage = vi.fn()
      .mockResolvedValueOnce({ photos: firstPage, hasMore: true })
      .mockResolvedValueOnce({ photos: secondPage, hasMore: false });

    render(<CoverPhotoPickerModal title="Elegir portada" fetchPage={fetchPage} onSelect={vi.fn()} onCancel={vi.fn()} />);

    await waitFor(() => expect(fetchPage).toHaveBeenNthCalledWith(1, 0, 60));
    await screen.findAllByAltText('Foto');
    expect(screen.getAllByAltText('Foto')).toHaveLength(2);
    expect(fetchPage).toHaveBeenCalledTimes(1);

    act(() => triggerIntersection(true));

    await waitFor(() => expect(fetchPage).toHaveBeenNthCalledWith(2, 2, 60));
    await waitFor(() => expect(screen.getAllByAltText('Foto')).toHaveLength(4));
  });

  it('stops requesting more pages once hasMore is false', async () => {
    const onlyPage = makePhotos('a', 1);
    const fetchPage = vi.fn().mockResolvedValue({ photos: onlyPage, hasMore: false });

    render(<CoverPhotoPickerModal title="Elegir portada" fetchPage={fetchPage} onSelect={vi.fn()} onCancel={vi.fn()} />);

    await waitFor(() => expect(fetchPage).toHaveBeenCalledTimes(1));

    act(() => triggerIntersection(true));
    act(() => triggerIntersection(true));

    // Give any (incorrect) extra fetch a chance to fire before asserting it didn't.
    await act(async () => {
      await Promise.resolve();
    });
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('shows an empty state when the first page comes back empty', async () => {
    const fetchPage = vi.fn().mockResolvedValue({ photos: [], hasMore: false });

    render(<CoverPhotoPickerModal title="Elegir portada" fetchPage={fetchPage} onSelect={vi.fn()} onCancel={vi.fn()} />);

    expect(await screen.findByText('Todavía no hay fotos aquí')).toBeInTheDocument();
  });
});

describe('CoverPhotoPickerModal crop step', () => {
  it('moves to the crop step on photo pick, then reports the chosen photo and crop on save', async () => {
    const photos = makePhotos('a', 1);
    const fetchPage = vi.fn().mockResolvedValue({ photos, hasMore: false });
    const onSelect = vi.fn();
    const onCancel = vi.fn();

    render(<CoverPhotoPickerModal title="Elegir portada" fetchPage={fetchPage} onSelect={onSelect} onCancel={onCancel} />);

    const photoButton = await screen.findByAltText('Foto');
    fireEvent.click(photoButton);

    const saveButton = await screen.findByRole('button', { name: 'Guardar portada' });
    fireEvent.click(saveButton);

    expect(onSelect).toHaveBeenCalledWith(photos[0], { x: 0.5, y: 0.5, scale: 1 });
    expect(onCancel).toHaveBeenCalled();
  });

  it('lets the back chevron return from the crop step to the picker grid', async () => {
    const photos = makePhotos('a', 1);
    const fetchPage = vi.fn().mockResolvedValue({ photos, hasMore: false });

    render(<CoverPhotoPickerModal title="Elegir portada" fetchPage={fetchPage} onSelect={vi.fn()} onCancel={vi.fn()} />);

    const photoButton = await screen.findByAltText('Foto');
    fireEvent.click(photoButton);
    await screen.findByRole('button', { name: 'Guardar portada' });

    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));

    expect(await screen.findAllByAltText('Foto')).toHaveLength(1);
  });
});
