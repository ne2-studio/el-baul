import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { CoverPhotoPickerModal } from '@/features/photos/components/CoverPhotoPickerModal';
import { Photo } from '@/types';
import { storybookPhotos } from '@/storybook/fixtures';
import { viewportGlobals } from '@/storybook/viewports';

const fixturePhotos = Object.values(storybookPhotos);

function makePhotos(count: number, offset = 0): Photo[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `photo-${offset + i}`,
    thumbnailUrl: fixturePhotos[(offset + i) % fixturePhotos.length],
    fullUrl: fixturePhotos[(offset + i) % fixturePhotos.length],
    recuerdoCount: 0,
  }));
}

const meta = {
  title: 'Features/Photos/CoverPhotoPickerModal',
  component: CoverPhotoPickerModal,
  tags: ['autodocs'],
} satisfies Meta<typeof CoverPhotoPickerModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Elegir portada del baúl',
    fetchPage: async (skip, take) => ({
      photos: makePhotos(Math.min(take, 24 - skip), skip),
      hasMore: skip + take < 24,
    }),
    onSelect: fn(),
    onCancel: fn(),
  },
  play: async ({ args }) => {
    // CoverPhotoPickerModal renders BottomSheetModal, which portals to document.body (see
    // its comment) instead of rendering inside canvasElement.
    const body = within(document.body);

    await waitFor(() => expect(body.queryByText('Cargando fotos...')).not.toBeInTheDocument());
    const photoButtons = body.getAllByRole('button', { name: 'Foto' });
    await expect(photoButtons[0]).toBeInTheDocument();

    await userEvent.click(photoButtons[0]);
    await expect(args.onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'photo-0' }));
    await expect(args.onCancel).toHaveBeenCalled();
  },
};

export const Empty: Story = {
  args: {
    title: 'Elegir portada del capítulo',
    fetchPage: async () => ({ photos: [], hasMore: false }),
    onSelect: (photo) => alert(`onSelect: ${photo.id}`),
    onCancel: () => alert('onCancel clicked'),
  },
};

export const Loading: Story = {
  args: {
    title: 'Elegir portada del baúl',
    fetchPage: () => new Promise(() => {}),
    onSelect: (photo) => alert(`onSelect: ${photo.id}`),
    onCancel: () => alert('onCancel clicked'),
  },
};

export const CoverPickerSheetMobileGrid: Story = {
  args: {
    ...Default.args,
  },
  globals: viewportGlobals.mobile,
};

export const CoverPickerNarrowOverflowGrid: Story = {
  args: {
    ...Default.args,
  },
  globals: viewportGlobals.narrow,
};

export const CoverPickerDesktopDrawerGrid: Story = {
  args: {
    ...Default.args,
  },
  globals: viewportGlobals.desktop,
};
