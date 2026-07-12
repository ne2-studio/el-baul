import React from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { UploadSuccessScreen } from '@/app/components/UploadSuccessScreen';
import { Baul, Album } from '@/types';

import { useDataStore } from '@/store/dataStore';

interface UploadSuccessRouteProps {
  navigate: (path: string) => void;
}

export const UploadSuccessRoute: React.FC<UploadSuccessRouteProps> = ({
  navigate,
}) => {
  const { baulId, albumId } = useParams();
  const location = useLocation();
  const { baules, albums } = useDataStore();
  const baul = baules.find(b => b.id === baulId);
  const album = albums[baulId!]?.find(a => a.id === albumId);
  const photoCount = parseInt(new URLSearchParams(location.search).get('count') || '0');
  
  if (!baul || !album) return <div className="p-8 text-center">Cargando...</div>;
  
  return (
    <UploadSuccessScreen
      baul={baul}
      album={album}
      photoCount={photoCount}
      onBack={() => navigate(`/baules/${baul.id}/albumes/${album.id}`)}
    />
  );
};
