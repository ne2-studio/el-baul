// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Photo } from '@/types';
import { PersonaAvatarPickerModal } from './PersonaAvatarPickerModal';

const taggedPhoto: Photo = { id: 'tagged', thumbnailUrl: '/tagged-thumb.jpg', fullUrl: '/tagged.jpg', recuerdoCount: 0, canDelete: false, canRequestRemoval: true };
const otherPhoto: Photo = { id: 'other', thumbnailUrl: '/other-thumb.jpg', fullUrl: '/other.jpg', recuerdoCount: 0, canDelete: false, canRequestRemoval: true };

beforeEach(() => {
  class TestIntersectionObserver {
    observe = vi.fn();
    disconnect = vi.fn();
  }
  vi.stubGlobal('IntersectionObserver', TestIntersectionObserver);
});

describe('PersonaAvatarPickerModal', () => {
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
