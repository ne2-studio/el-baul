// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeedItem, PhotoBatch, Recuerdo } from '@/types';
import { FeedTab } from '@/features/memories/components/FeedTab';

function newRecuerdo(overrides: Partial<ConstructorParameters<typeof Recuerdo>[0]> = {}): Recuerdo {
  return new Recuerdo({
    id: 'r1', userId: 'user-1', text: 'Un recuerdo precioso', userName: 'Ana',
    createdAt: new Date().toISOString(), isOwn: false, ...overrides,
  });
}

function newPhotoBatch(overrides: Partial<ConstructorParameters<typeof PhotoBatch>[0]> = {}): PhotoBatch {
  return new PhotoBatch({
    batchId: 'batch-1', userId: 'user-1', userName: 'Tita Loli', photoCount: 2,
    createdAt: new Date().toISOString(),
    previewPhotos: [{
      id: 'p1', baulId: 'baul-1', thumbnailUrl: 't1', fullUrl: 'f1', uploadedBy: 'user-1',
      createdAt: new Date().toISOString(), recuerdoCount: 0,
    }],
    ...overrides,
  });
}

describe('FeedTab', () => {
  it('shows the empty state when there are no feed items', () => {
    render(<FeedTab feedItems={[]} />);

    expect(screen.getByText('Todavía no hay recuerdos')).toBeInTheDocument();
  });

  it('renders a recuerdo card for a recuerdo item', () => {
    const recuerdo = newRecuerdo({ text: 'Qué buen día' });
    const items: FeedItem[] = [{ type: 'recuerdo', createdAt: recuerdo.createdAt, recuerdo }];

    render(<FeedTab feedItems={items} />);

    expect(screen.getByText('Qué buen día')).toBeInTheDocument();
  });

  it('renders a photo-batch card for a photo_batch item', () => {
    const photoBatch = newPhotoBatch();
    const items: FeedItem[] = [{ type: 'photo_batch', createdAt: photoBatch.createdAt, photoBatch }];

    render(<FeedTab feedItems={items} />);

    expect(screen.getByText('Tita Loli')).toBeInTheDocument();
    expect(screen.getByText('subió 2 fotos', { exact: false })).toBeInTheDocument();
  });

  it('renders both kinds together, in the order given', () => {
    const recuerdo = newRecuerdo({ text: 'Recuerdo reciente' });
    const photoBatch = newPhotoBatch();
    const items: FeedItem[] = [
      { type: 'recuerdo', createdAt: recuerdo.createdAt, recuerdo },
      { type: 'photo_batch', createdAt: photoBatch.createdAt, photoBatch },
    ];

    render(<FeedTab feedItems={items} />);

    const cards = screen.getAllByText(/Recuerdo reciente|Tita Loli/);
    expect(cards.map((el) => el.textContent)).toEqual(['Recuerdo reciente', 'Tita Loli']);
  });

  it('opens the batch grid via onOpenBatchGrid when there are more photos than the preview', async () => {
    const user = userEvent.setup();
    const onOpenBatchGrid = vi.fn();
    const photoBatch = newPhotoBatch({ photoCount: 10 });
    const items: FeedItem[] = [{ type: 'photo_batch', createdAt: photoBatch.createdAt, photoBatch }];

    render(<FeedTab feedItems={items} onOpenBatchGrid={onOpenBatchGrid} />);
    await user.click(screen.getByRole('button', { name: /más/ }));

    expect(onOpenBatchGrid).toHaveBeenCalledWith(photoBatch);
  });

  it('opens a photo directly via onOpenBatchPhoto when a preview thumbnail is clicked', async () => {
    const user = userEvent.setup();
    const onOpenBatchPhoto = vi.fn();
    const photoBatch = newPhotoBatch();
    const items: FeedItem[] = [{ type: 'photo_batch', createdAt: photoBatch.createdAt, photoBatch }];

    render(<FeedTab feedItems={items} onOpenBatchPhoto={onOpenBatchPhoto} />);
    await user.click(screen.getByRole('button', { name: 'Ver foto' }));

    expect(onOpenBatchPhoto).toHaveBeenCalledWith(photoBatch, photoBatch.previewPhotos[0]);
  });
});
