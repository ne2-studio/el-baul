import React from 'react';
import { useParams } from 'react-router-dom';
import { UploadErrorScreen } from '@/app/components/UploadErrorScreen';
import { Baul, Album } from '@/types';

import { useDataStore } from '@/store/dataStore';

interface UploadErrorRouteProps {
  navigate: (path: string) => void;
}

export const UploadErrorRoute: React.FC<UploadErrorRouteProps> = ({
  navigate,
}) => {
  const { baulId, albumId } = useParams();
  const { baules, albums } = useDataStore();
  const baul = baules.find(b => b.id === baulId);
  const album = albums[baulId!]?.find(a => a.id === albumId);
  
  if (!baul || !album) return <div className="p-8 text-center">Cargando...</div>;
  
  return (
    <UploadErrorScreen
      baul={baul}
      album={album}
      onBack={() => navigate(`/baules/${baul.id}/albumes/${album.id}`)}
    />
  );
};
