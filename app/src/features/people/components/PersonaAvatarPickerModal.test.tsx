// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Photo } from '@/types';
import { PersonaAvatarPickerModal } from './PersonaAvatarPickerModal';

const taggedPhoto: Photo = { id: 'tagged', thumbnailUrl: '/tagged-thumb.jpg', fullUrl: '/tagged.jpg', recuerdoCount: 0, canDelete: false, canRequestRemoval: true };
const otherPhoto: Photo = { id: 'other', thumbnailUrl: '/other-thumb.jpg', fullUrl: '/other.jpg', recuerdoCount: 0, canDelete: false, canRequestRemoval: true };

function makePhotos(prefix: string, count: number): Photo[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i}`,
    thumbnailUrl: `/${prefix}-${i}-thumb.jpg`,
    fullUrl: `/${prefix}-${i}.jpg`,
    recuerdoCount: 0,
    canDelete: false,
    canRequestRemoval: true,
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

describe('PersonaAvatarPickerModal', () => {
  it('loads the first page on mount and fetches the next one only once the sentinel intersects', async () => {
    const firstPage = makePhotos('a', 2);
    const secondPage = makePhotos('b', 2);
    const fetchPage = vi.fn()
      .mockResolvedValueOnce({ photos: firstPage, hasMore: true })
      .mockResolvedValueOnce({ photos: secondPage, hasMore: false });

    render(
      <PersonaAvatarPickerModal
        personaName="Abuela"
        taggedPhotos={[]}
        fetchPage={fetchPage}
        onSelectExisting={vi.fn()}
        onUploadNew={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    await waitFor(() => expect(fetchPage).toHaveBeenNthCalledWith(1, 0, 60));
    await screen.findAllByRole('button', { name: /Elegir foto/ });
    expect(screen.getAllByRole('button', { name: /Elegir foto/ })).toHaveLength(2);
    expect(fetchPage).toHaveBeenCalledTimes(1);

    act(() => triggerIntersection(true));

    await waitFor(() => expect(fetchPage).toHaveBeenNthCalledWith(2, 2, 60));
    await waitFor(() => expect(screen.getAllByRole('button', { name: /Elegir foto/ })).toHaveLength(4));
  });

  it('stops requesting more pages once hasMore is false', async () => {
    const onlyPage = makePhotos('a', 1);
    const fetchPage = vi.fn().mockResolvedValue({ photos: onlyPage, hasMore: false });

    render(
      <PersonaAvatarPickerModal
        personaName="Abuela"
        taggedPhotos={[]}
        fetchPage={fetchPage}
        onSelectExisting={vi.fn()}
        onUploadNew={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    await waitFor(() => expect(fetchPage).toHaveBeenCalledTimes(1));

    act(() => triggerIntersection(true));
    act(() => triggerIntersection(true));

    // Give any (incorrect) extra fetch a chance to fire before asserting it didn't.
    await act(async () => {
      await Promise.resolve();
    });
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('prioritizes already tagged photos and submits the selected crop', async () => {
    const user = userEvent.setup();
    const onSelectExisting = vi.fn();
    const fetchPage = vi.fn().mockResolvedValue({ photos: [otherPhoto, taggedPhoto], hasMore: false });

    render(
      <PersonaAvatarPickerModal
        personaName="Abuela"
        taggedPhotos={[taggedPhoto]}
        fetchPage={fetchPage}
        onSelectExisting={onSelectExisting}
        onUploadNew={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    await waitFor(() => expect(fetchPage).toHaveBeenCalledWith(0, 60));
    const choices = await screen.findAllByRole('button', { name: /Elegir foto/ });
    expect(choices[0]).toHaveAccessibleName('Elegir foto tagged');

    await user.click(choices[0]);
    fireEvent.change(screen.getByLabelText('Zoom'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Horizontal'), { target: { value: '0.25' } });
    fireEvent.change(screen.getByLabelText('Vertical'), { target: { value: '0.75' } });
    await user.click(screen.getByRole('button', { name: 'Guardar foto' }));

    expect(onSelectExisting).toHaveBeenCalledWith(taggedPhoto, { x: 0.25, y: 0.75, scale: 2 });
  });

  it('groups tagged and untagged photos under separate swimlanes', async () => {
    const fetchPage = vi.fn().mockResolvedValue({ photos: [otherPhoto, taggedPhoto], hasMore: false });

    render(
      <PersonaAvatarPickerModal
        personaName="Abuela"
        taggedPhotos={[taggedPhoto]}
        fetchPage={fetchPage}
        onSelectExisting={vi.fn()}
        onUploadNew={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    await waitFor(() => expect(fetchPage).toHaveBeenCalledWith(0, 60));
    expect(await screen.findByText('Fotos en las que sale Abuela')).toBeInTheDocument();
    expect(screen.getByText('Resto de fotos')).toBeInTheDocument();
  });

  it('shows a single ungrouped grid without swimlanes when nothing is tagged', async () => {
    const fetchPage = vi.fn().mockResolvedValue({ photos: [otherPhoto], hasMore: false });

    render(
      <PersonaAvatarPickerModal
        personaName="Abuela"
        taggedPhotos={[]}
        fetchPage={fetchPage}
        onSelectExisting={vi.fn()}
        onUploadNew={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    await waitFor(() => expect(fetchPage).toHaveBeenCalledWith(0, 60));
    await screen.findByRole('button', { name: 'Elegir foto other' });
    expect(screen.queryByText(/Fotos en las que sale/)).not.toBeInTheDocument();
    expect(screen.queryByText('Resto de fotos')).not.toBeInTheDocument();
  });

  it('replaces the picker with a full crop screen on selection, with a way back', async () => {
    const user = userEvent.setup();
    const fetchPage = vi.fn().mockResolvedValue({ photos: [otherPhoto], hasMore: false });

    render(
      <PersonaAvatarPickerModal
        personaName="Abuela"
        taggedPhotos={[]}
        fetchPage={fetchPage}
        onSelectExisting={vi.fn()}
        onUploadNew={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const choice = await screen.findByRole('button', { name: 'Elegir foto other' });
    await user.click(choice);

    expect(screen.getByLabelText('Zoom')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Subir foto nueva' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Elegir foto other' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Volver' }));

    expect(screen.getByRole('button', { name: 'Subir foto nueva' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Zoom')).not.toBeInTheDocument();
  });
});
