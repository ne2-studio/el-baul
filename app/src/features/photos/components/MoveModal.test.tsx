// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Chapter } from '@/types';
import { MoveModal } from './MoveModal';

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
});
