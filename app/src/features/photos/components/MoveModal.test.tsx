// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Chapter } from '@/types';
import { MoveModal, NEW_CHAPTER_OPTION_ID } from './MoveModal';

const chapters: Chapter[] = [
  { id: '1', name: 'Navidad en familia', photoCount: 0, lastUpdated: '', recuerdoCount: 0, undatedPhotoCount: 0 },
  { id: '2', name: 'Viaje a Portugal', photoCount: 0, lastUpdated: '', recuerdoCount: 0, undatedPhotoCount: 0 },
  { id: '3', name: 'Boda de Marta y Iván', photoCount: 0, lastUpdated: '', recuerdoCount: 0, undatedPhotoCount: 0 },
];

describe('MoveModal', () => {
  it('filters the chapter list as the user types in the search box', async () => {
    const user = userEvent.setup();
    render(
      <MoveModal
        title="Mover a otro capítulo"
        chapters={chapters}
        selectedId=""
        onSelect={vi.fn()}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText('Navidad en familia')).toBeInTheDocument();
    expect(screen.getByText('Viaje a Portugal')).toBeInTheDocument();
    expect(screen.getByText('Boda de Marta y Iván')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Buscar capítulo'), 'portu');

    expect(screen.queryByText('Navidad en familia')).not.toBeInTheDocument();
    expect(screen.getByText('Viaje a Portugal')).toBeInTheDocument();
    expect(screen.queryByText('Boda de Marta y Iván')).not.toBeInTheDocument();
  });

  it('keeps the list container a fixed height, with room between rows and the scrollbar, regardless of filtering', async () => {
    const user = userEvent.setup();
    render(
      <MoveModal
        title="Mover a otro capítulo"
        chapters={chapters}
        selectedId=""
        onSelect={vi.fn()}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    const list = screen.getByText('Navidad en familia').closest('div.overflow-y-auto') as HTMLElement;
    expect(list).toHaveClass('h-64');
    expect(list).not.toHaveClass('max-h-64');
    expect(list).toHaveClass('pr-2');

    await user.type(screen.getByLabelText('Buscar capítulo'), 'portu');

    // Filtering only changes which rows render, never the container itself.
    expect(list).toHaveClass('h-64');
    expect(list).toHaveClass('pr-2');
  });

  it('shows a message when no chapter matches the search', async () => {
    const user = userEvent.setup();
    render(
      <MoveModal
        title="Mover a otro capítulo"
        chapters={chapters}
        selectedId=""
        onSelect={vi.fn()}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    await user.type(screen.getByLabelText('Buscar capítulo'), 'inexistente');

    expect(screen.getByText('No se encontraron capítulos.')).toBeInTheDocument();
    expect(screen.queryByText('Navidad en familia')).not.toBeInTheDocument();
  });

  it('still lets the user select a chapter after filtering', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <MoveModal
        title="Mover a otro capítulo"
        chapters={chapters}
        selectedId=""
        onSelect={onSelect}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    await user.type(screen.getByLabelText('Buscar capítulo'), 'boda');
    await user.click(screen.getByText('Boda de Marta y Iván'));

    expect(onSelect).toHaveBeenCalledWith('3');
  });

  it('does not show the "new chapter" option when the search box is empty', () => {
    render(
      <MoveModal
        title="Mover a otro capítulo"
        chapters={chapters}
        selectedId=""
        onSelect={vi.fn()}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.queryByText(/^Nuevo capítulo/)).not.toBeInTheDocument();
  });

  it('shows a "new chapter" option with the typed text once the user has typed something, separated by a divider', async () => {
    const user = userEvent.setup();
    render(
      <MoveModal
        title="Mover a otro capítulo"
        chapters={chapters}
        selectedId=""
        onSelect={vi.fn()}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    await user.type(screen.getByLabelText('Buscar capítulo'), 'inexistente');

    expect(screen.getByText('No se encontraron capítulos.')).toBeInTheDocument();
    const option = screen.getByText('Nuevo capítulo "inexistente"');
    expect(option).toBeInTheDocument();
    expect(document.querySelector('hr')).toBeInTheDocument();
  });

  it('selects the "new chapter" option, mutually exclusive with an existing chapter', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <MoveModal
        title="Mover a otro capítulo"
        chapters={chapters}
        selectedId=""
        onSelect={onSelect}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    await user.type(screen.getByLabelText('Buscar capítulo'), 'boda');
    await user.click(screen.getByText('Nuevo capítulo "boda"'));

    expect(onSelect).toHaveBeenCalledWith(NEW_CHAPTER_OPTION_ID);
  });

  it('calls onConfirm with the trimmed typed text when the "new chapter" option is selected', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <MoveModal
        title="Mover a otro capítulo"
        chapters={chapters}
        selectedId={NEW_CHAPTER_OPTION_ID}
        onSelect={vi.fn()}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />
    );

    await user.type(screen.getByLabelText('Buscar capítulo'), '  Vacaciones de verano  ');
    await user.click(screen.getByRole('button', { name: /mover aquí/i }));

    expect(onConfirm).toHaveBeenCalledWith('Vacaciones de verano');
  });

  it('calls onConfirm with no argument when an existing chapter is selected', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <MoveModal
        title="Mover a otro capítulo"
        chapters={chapters}
        selectedId="2"
        onSelect={vi.fn()}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />
    );

    await user.click(screen.getByRole('button', { name: /mover aquí/i }));

    expect(onConfirm).toHaveBeenCalledWith(undefined);
  });
});
