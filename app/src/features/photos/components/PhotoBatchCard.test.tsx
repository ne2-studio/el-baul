// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PhotoBatch, Photo } from '@/types';
import { PhotoBatchCard } from '@/features/photos/components/PhotoBatchCard';

function newPreviewPhoto(id: string): ConstructorParameters<typeof Photo>[0] {
  return {
    id, baulId: 'baul-1', thumbnailUrl: `${id}-thumb`, fullUrl: `${id}-full`,
    uploadedBy: 'user-1', createdAt: new Date().toISOString(), recuerdoCount: 0,
  };
}

function newPhotoBatch(overrides: Partial<ConstructorParameters<typeof PhotoBatch>[0]> = {}): PhotoBatch {
  return new PhotoBatch({
    batchId: 'batch-1',
    userId: 'user-1',
    userName: 'Ana',
    photoCount: 2,
    createdAt: new Date().toISOString(),
    previewPhotos: [newPreviewPhoto('p1'), newPreviewPhoto('p2')],
    ...overrides,
  });
}

describe('PhotoBatchCard', () => {
  it('shows the uploader and photo count in the header', () => {
    render(<PhotoBatchCard photoBatch={newPhotoBatch({ userName: 'Tita Loli', photoCount: 6 })} onOpenPhoto={vi.fn()} onOpenGrid={vi.fn()} />);

    expect(screen.getByText('Tita Loli')).toBeInTheDocument();
    expect(screen.getByText('subió 6 fotos', { exact: false })).toBeInTheDocument();
  });

  it('uses singular phrasing for a single-photo batch', () => {
    render(
      <PhotoBatchCard
        photoBatch={newPhotoBatch({ photoCount: 1, previewPhotos: [newPreviewPhoto('p1')] })}
        onOpenPhoto={vi.fn()}
        onOpenGrid={vi.fn()}
      />
    );

    expect(screen.getByText('subió 1 foto', { exact: false })).toBeInTheDocument();
  });

  it('opens the gallery on that exact photo when a preview thumbnail is clicked', async () => {
    const user = userEvent.setup();
    const onOpenPhoto = vi.fn();
    const batch = newPhotoBatch();
    render(<PhotoBatchCard photoBatch={batch} onOpenPhoto={onOpenPhoto} onOpenGrid={vi.fn()} />);

    await user.click(screen.getAllByRole('button', { name: 'Ver foto' })[1]);

    expect(onOpenPhoto).toHaveBeenCalledWith(batch.previewPhotos[1]);
  });

  it('shows a "y N más" tile that opens the grid when there are more photos than the preview', async () => {
    const user = userEvent.setup();
    const onOpenGrid = vi.fn();
    render(
      <PhotoBatchCard
        photoBatch={newPhotoBatch({
          photoCount: 10,
          previewPhotos: [newPreviewPhoto('p1'), newPreviewPhoto('p2'), newPreviewPhoto('p3'), newPreviewPhoto('p4')],
        })}
        onOpenPhoto={vi.fn()}
        onOpenGrid={onOpenGrid}
      />
    );

    const moreButton = screen.getByRole('button', { name: 'y 6 más' });
    await user.click(moreButton);

    expect(onOpenGrid).toHaveBeenCalledTimes(1);
  });

  it('hides the "más" tile when every photo already fits in the preview', () => {
    render(
      <PhotoBatchCard
        photoBatch={newPhotoBatch({ photoCount: 2, previewPhotos: [newPreviewPhoto('p1'), newPreviewPhoto('p2')] })}
        onOpenPhoto={vi.fn()}
        onOpenGrid={vi.fn()}
      />
    );

    expect(screen.queryByText('más', { exact: false })).not.toBeInTheDocument();
  });

  it('shows the chapter badge and opens the chapter when clicked', async () => {
    const user = userEvent.setup();
    const onChapterClick = vi.fn();
    render(
      <PhotoBatchCard
        photoBatch={newPhotoBatch({ chapterId: 'chapter-1', chapterName: 'Verano 2019' })}
        onOpenPhoto={vi.fn()}
        onOpenGrid={vi.fn()}
        onChapterClick={onChapterClick}
      />
    );

    await user.click(screen.getByRole('button', { name: 'en «Verano 2019»' }));

    expect(onChapterClick).toHaveBeenCalledWith('chapter-1');
  });

  it('opens the persona when the avatar is clicked and a personaId/handler are present', async () => {
    const user = userEvent.setup();
    const onUserClick = vi.fn();
    render(
      <PhotoBatchCard photoBatch={newPhotoBatch({ personaId: 'persona-1' })} onOpenPhoto={vi.fn()} onOpenGrid={vi.fn()} onUserClick={onUserClick} />
    );

    await user.click(screen.getByRole('button', { name: 'Ver perfil de Ana' }));

    expect(onUserClick).toHaveBeenCalledWith('persona-1');
  });
});
