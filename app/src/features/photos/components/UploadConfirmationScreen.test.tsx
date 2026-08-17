// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Chapter } from '@/types';
import { SelectedPhoto } from '@/features/photos/uploadFlow';
import { UploadConfirmationScreen } from './UploadConfirmationScreen';

vi.mock('@/features/photos/uploadFlow', async () => {
  const actual = await vi.importActual<typeof import('@/features/photos/uploadFlow')>(
    '@/features/photos/uploadFlow'
  );
  return { ...actual, materializeFileList: vi.fn() };
});

import { materializeFileList } from '@/features/photos/uploadFlow';

const currentChapter: Chapter = {
  id: 'c1',
  name: 'Verano 2024',
  photoCount: 12,
  lastUpdated: 'hace 1 día',
  recuerdoCount: 0,
  undatedPhotoCount: 0,
};

function makePhotos(count: number, offset = 0): SelectedPhoto[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${offset + i + 1}`,
    file: new File([], `photo${offset + i + 1}.jpg`),
    preview: `blob:preview-${offset + i + 1}`,
  }));
}

function makeFiles(count: number): File[] {
  return Array.from({ length: count }, (_, i) => new File(['x'], `new${i + 1}.jpg`, { type: 'image/jpeg' }));
}

describe('UploadConfirmationScreen — 30-photo cap per upload (issue #37)', () => {
  it('trims the selection to 30 and notifies via onPhotosLimitExceeded when the file picker adds more than the max', async () => {
    const user = userEvent.setup();
    const newFiles = makeFiles(5);
    vi.mocked(materializeFileList).mockResolvedValue({
      selectedPhotos: makePhotos(5, 28),
      droppedCount: 0,
    });
    const onPhotosLimitExceeded = vi.fn();

    render(
      <UploadConfirmationScreen
        currentChapter={currentChapter}
        selectedPhotos={makePhotos(28)}
        onBack={vi.fn()}
        onPhotosLimitExceeded={onPhotosLimitExceeded}
        onUpload={vi.fn()}
      />
    );

    expect(screen.getByText('28 fotos seleccionadas')).toBeInTheDocument();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, newFiles);

    expect(await screen.findByText('30 fotos seleccionadas')).toBeInTheDocument();
    expect(onPhotosLimitExceeded).toHaveBeenCalledWith(3);
  });

  it('does not call onPhotosLimitExceeded when the total stays within the max', async () => {
    const user = userEvent.setup();
    const newFiles = makeFiles(2);
    vi.mocked(materializeFileList).mockResolvedValue({
      selectedPhotos: makePhotos(2, 3),
      droppedCount: 0,
    });
    const onPhotosLimitExceeded = vi.fn();

    render(
      <UploadConfirmationScreen
        currentChapter={currentChapter}
        selectedPhotos={makePhotos(3)}
        onBack={vi.fn()}
        onPhotosLimitExceeded={onPhotosLimitExceeded}
        onUpload={vi.fn()}
      />
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, newFiles);

    expect(await screen.findByText('5 fotos seleccionadas')).toBeInTheDocument();
    expect(onPhotosLimitExceeded).not.toHaveBeenCalled();
  });
});
