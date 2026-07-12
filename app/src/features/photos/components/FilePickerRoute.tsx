import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FilePickerModal } from '@/app/components/FilePickerModal';
import { useAppStore } from '@/store/useAppStore';

export const FilePickerRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baulId, albumId } = useParams();
  const { baules, albums } = useAppStore();
  const baul = baules.find(b => b.id === baulId);
  const album = albums[baulId!]?.find(a => a.id === albumId);
  
  if (!baul || !album) return <div className="p-8 text-center">Cargando...</div>;
  
  return (
    <FilePickerModal
      baul={baul}
      album={album}
      onBack={() => navigate(`/baules/${baul.id}/albumes/${album.id}`)}
      onUpload={(selectedPhotos) => {
        navigate(`/baules/${baul.id}/albumes/${album.id}/confirmar`, { state: { selectedPhotos } });
      }}
    />
  );
};
