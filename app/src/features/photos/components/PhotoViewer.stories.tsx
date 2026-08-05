import type { Meta, StoryObj } from '@storybook/react-vite';
import { Download, BookImage, FolderInput, Calendar, Flag, Trash2, Tag, Share2 } from 'lucide-react';
import { BaulIcon } from '@/design-system/foundations/icons/BaulIcon';
import { PhotoViewer } from '@/features/photos/components/PhotoViewer';
import { PhotoViewerMenuItem } from '@/features/photos/components/PhotoViewerHeader';
import { Photo, Recuerdo } from '@/types';
import { storybookPhotos } from '@/storybook/fixtures';
import { viewportGlobals } from '@/storybook/viewports';

const meta = {
  title: 'Features/Photos/PhotoViewer',
  component: PhotoViewer,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof PhotoViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

const photos: Photo[] = [
  { id: '1', thumbnailUrl: storybookPhotos.beach, fullUrl: storybookPhotos.beach, recuerdoCount: 0 },
  { id: '2', thumbnailUrl: storybookPhotos.album, fullUrl: storybookPhotos.album, date: { year: 2024, month: 7, day: 15 }, recuerdoCount: 2 },
  { id: '3', thumbnailUrl: storybookPhotos.sunset, fullUrl: storybookPhotos.sunset, recuerdoCount: 0 },
];

const recuerdos: Recuerdo[] = [
  { id: '1', text: '¡Qué día tan bonito! No me acordaba de que hacía tanto calor.', userName: 'Ana García', createdAt: '2024-07-15T10:00:00Z' },
  { id: '2', text: 'Yo estuve ahí, fue un día increíble.', userName: 'Yo', isOwn: true, createdAt: '2024-07-16T10:00:00Z' },
];

// PhotoViewer es 100% puro: el menú "···" que aquí se ve viene ya resuelto (usePhotoViewerActions
// + buildMenuItems, vía PhotoViewerContainer/ChapterPhotoViewerContainer en la app real) — esta
// story lo simula a mano con los mismos items, en el mismo orden (acciones destructivas al
// final), para no depender de ningún store/router.
function menuItems(isAdmin: boolean): PhotoViewerMenuItem[] {
  const items: PhotoViewerMenuItem[] = [
    { key: 'tag-personas', label: 'Etiquetar personas', icon: Tag, onSelect: () => alert('Etiquetar personas') },
    { key: 'share', label: 'Compartir foto', icon: Share2, onSelect: () => alert('Compartir foto') },
    { key: 'download', label: 'Descargar foto original', icon: Download, onSelect: () => alert('Descargar foto original') },
  ];
  if (isAdmin) {
    items.push({ key: 'baul-cover', label: 'Establecer como portada del baúl', icon: BaulIcon, onSelect: () => alert('Portada del baúl') });
  }
  items.push(
    { key: 'chapter-cover', label: 'Establecer como portada del capítulo', icon: BookImage, onSelect: () => alert('Portada del capítulo') },
    { key: 'move', label: 'Mover a otro capítulo', icon: FolderInput, onSelect: () => alert('Mover a otro capítulo') },
    { key: 'date', label: 'Cambiar fecha', icon: Calendar, onSelect: () => alert('Cambiar fecha') },
  );
  if (!isAdmin) {
    items.push({ key: 'removal', label: 'Solicitar retirada', icon: Flag, onSelect: () => alert('Solicitar retirada') });
  }
  if (isAdmin) {
    items.push({ key: 'delete', label: 'Retirar foto', icon: Trash2, onSelect: () => alert('Retirar foto'), variant: 'destructive' });
  }
  return items;
}

const sharedDefaults = {
  onClose: () => alert('onClose clicked'),
  onPhotoChange: () => alert('onPhotoChange clicked'),
  canChangeDate: true,
  openDateModal: () => alert('openDateModal clicked'),
  modals: null,
  onAddRecuerdo: () => alert('onAddRecuerdo clicked'),
  onUserClick: () => alert('onUserClick clicked'),
};

export const Default: Story = {
  args: {
    ...sharedDefaults,
    photo: photos[1],
    photos,
    menuItems: menuItems(true),
    recuerdos,
  },
};

export const FirstPhoto: Story = {
  args: {
    ...Default.args,
    photo: photos[0],
  },
};

export const LastPhoto: Story = {
  args: {
    ...Default.args,
    photo: photos[2],
  },
};

export const WithoutRecuerdos: Story = {
  args: {
    ...Default.args,
    recuerdos: [],
  },
};

export const ReadOnlyCollaborator: Story = {
  args: {
    ...sharedDefaults,
    photo: photos[1],
    photos,
    menuItems: menuItems(false),
    recuerdos,
  },
};

export const PhotoViewerMobileStack: Story = {
  args: {
    ...Default.args,
  },
  globals: viewportGlobals.mobile,
};

export const PhotoViewerDesktopSideNavigation: Story = {
  args: {
    ...Default.args,
  },
  globals: viewportGlobals.desktop,
};
