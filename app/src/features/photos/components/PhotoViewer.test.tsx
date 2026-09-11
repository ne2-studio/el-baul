// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Photo } from '@/types';
import { PhotoViewer } from '@/features/photos/components/PhotoViewer';

const photos: Photo[] = [
  { id: 'photo-1', thumbnailUrl: '/photo-1-thumb.jpg', fullUrl: '/photo-1.jpg', recuerdoCount: 0, canDelete: false, canRequestRemoval: true },
  { id: 'photo-2', thumbnailUrl: '/photo-2-thumb.jpg', fullUrl: '/photo-2.jpg', recuerdoCount: 0, canDelete: false, canRequestRemoval: true },
  { id: 'photo-3', thumbnailUrl: '/photo-3-thumb.jpg', fullUrl: '/photo-3.jpg', recuerdoCount: 0, canDelete: false, canRequestRemoval: true },
];

function renderViewer(overrides: Partial<ComponentProps<typeof PhotoViewer>> = {}) {
  const onPhotoChange = vi.fn();
  render(
    <PhotoViewer
      photo={photos[1]}
      photos={photos}
      onClose={vi.fn()}
      onPhotoChange={onPhotoChange}
      menuItems={[]}
      canChangeDate
      openDateModal={vi.fn()}
      modals={null}
      onAddRecuerdo={vi.fn()}
      {...overrides}
    />
  );

  return { onPhotoChange };
}

describe('PhotoViewer keyboard navigation', () => {
  // The recuerdo textarea only renders where the recuerdos panel is visible — always on
  // desktop — so this uses the desktop layout to reach it directly.
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps arrow keys inside the recuerdo textarea from changing photos', () => {
    stubMatchMedia(true);
    const { onPhotoChange } = renderViewer();

    const textarea = screen.getByRole('textbox');
    textarea.focus();
    fireEvent.keyDown(textarea, { key: 'ArrowRight' });
    fireEvent.keyDown(textarea, { key: 'ArrowLeft' });

    expect(onPhotoChange).not.toHaveBeenCalled();
  });

  it('uses arrow keys for gallery navigation when focus is not in an editable field', () => {
    const { onPhotoChange } = renderViewer();

    fireEvent.keyDown(window, { key: 'ArrowRight' });

    expect(onPhotoChange).toHaveBeenCalledWith(photos[2]);
  });
});

// Regresión issue #67: "Foto apaisada se ve más pequeña al girar el teléfono" — un móvil grande
// en horizontal supera los 768px de ancho (el breakpoint `md`) sin ganar altura, así que el
// layout de escritorio (cabecera fija + panel lateral) no debe activarse solo por ancho.
function stubMatchMedia(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
  );
}

describe('PhotoViewer layout vs. viewport shape', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps the mobile full-bleed layout on a short-and-wide viewport (phone in landscape)', () => {
    stubMatchMedia(false);

    renderViewer();

    // Mobile layout: the collapsed "Ver recuerdos" bottom bar is present, there's no
    // always-visible desktop side panel.
    expect(screen.getByLabelText('Ver recuerdos')).toBeInTheDocument();
    expect(screen.queryByText('Sé el primero en añadir un recuerdo')).not.toBeInTheDocument();
  });

  it('uses the desktop layout on a genuinely wide-and-tall viewport', () => {
    stubMatchMedia(true);

    renderViewer({ recuerdos: [] });

    // Desktop layout: the recuerdos panel is always visible, no collapsed mobile bottom bar.
    expect(screen.queryByLabelText('Ver recuerdos')).not.toBeInTheDocument();
    expect(screen.getByText('Sé el primero en añadir un recuerdo')).toBeInTheDocument();
  });
});

describe('PhotoViewer recuerdos loading state', () => {
  // The recuerdos panel content only ever renders when visible: always on desktop, only once
  // expanded on mobile — so these tests use the desktop layout to see it unconditionally.
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows a spinner instead of the empty state while recuerdos are loading', () => {
    stubMatchMedia(true);
    renderViewer({ recuerdos: [], recuerdosLoading: true });

    expect(screen.getByLabelText('Cargando recuerdos')).toBeInTheDocument();
    expect(screen.queryByText('Sé el primero en añadir un recuerdo')).not.toBeInTheDocument();
  });

  it('falls back to the empty state once loading finishes with no recuerdos', () => {
    stubMatchMedia(true);
    renderViewer({ recuerdos: [], recuerdosLoading: false });

    expect(screen.queryByLabelText('Cargando recuerdos')).not.toBeInTheDocument();
    expect(screen.getByText('Sé el primero en añadir un recuerdo')).toBeInTheDocument();
  });
});
