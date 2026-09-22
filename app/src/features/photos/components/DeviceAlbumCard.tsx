import React from 'react';
import { ImageIcon } from 'lucide-react';
import { ContentCard } from '@/design-system/components/data-display/ContentCard';
import { DeviceAlbum } from '@/features/photos/native/devicePhotos';

interface DeviceAlbumCardProps {
  album: DeviceAlbum;
  onClick: () => void;
}

export function DeviceAlbumCard({ album, onClick }: DeviceAlbumCardProps) {
  return (
    <ContentCard
      title={album.displayName}
      coverImageUrl={album.coverImageUrl}
      counters={[{ icon: <ImageIcon />, label: `${album.count} ${album.count === 1 ? 'foto' : 'fotos'}` }]}
      onClick={onClick}
    />
  );
}
