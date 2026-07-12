import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PhotosView } from '@/app/components/PhotosView';
import { useDataStore } from '@/store/dataStore';

export const AlbumRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baulId, albumId } = useParams();
  const { baules, albums, photos } = useDataStore();
  
  const baul = baules.find(b => b.id === baulId);
  const album = albums[baulId!]?.find(a => a.id === albumId);
  
  if (!baul || !album) return <div className="p-8 text-center">Cargando álbum...</div>;

  return (
    <PhotosView
      album={album}
      photos={photos[album.id] || []}
      onBack={() => navigate(`/baules/${baul.id}`)}
      onSelectPhoto={(photo) => navigate(`/baules/${baul.id}/albumes/${album.id}/foto/${photo.id}`)}
      onAddPhotos={() => navigate(`/baules/${baul.id}/albumes/${album.id}/subir`)}
    />
  );
};
