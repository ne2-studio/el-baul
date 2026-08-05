// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Photo } from '@/types';
import { PhotoViewer } from '@/features/photos/components/PhotoViewer';

const photos: Photo[] = [
  { id: 'photo-1', thumbnailUrl: '/photo-1-thumb.jpg', fullUrl: '/photo-1.jpg', recuerdoCount: 0 },
  { id: 'photo-2', thumbnailUrl: '/photo-2-thumb.jpg', fullUrl: '/photo-2.jpg', recuerdoCount: 0 },
  { id: 'photo-3', thumbnailUrl: '/photo-3-thumb.jpg', fullUrl: '/photo-3.jpg', recuerdoCount: 0 },
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
  it('keeps arrow keys inside the recuerdo textarea from changing photos', () => {
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
