import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChatMemoriesScreen } from '@/features/chat/components/ChatMemoriesScreen';
import { deleteChatMemory, loadChatMemories, updateChatMemory } from '@/features/chat/useCases';
import { useChatMemoriesStore } from '@/store/useChatMemoriesStore';
import { ChatMemory } from '@/types';

export const ChatMemoriesRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baulId } = useParams();
  const { baulId: activeBaulId, memories, isLoading, hasError } = useChatMemoriesStore();

  useEffect(() => {
    if (!baulId) return;
    void loadChatMemories(baulId);
  }, [baulId]);

  const isCurrentBaul = baulId === activeBaulId;

  const handleEdit = async (memory: ChatMemory, content: string) => {
    if (!baulId) return false;
    return updateChatMemory(baulId, memory.id, content);
  };

  const handleDelete = async (memory: ChatMemory) => {
    if (!baulId) return false;
    return deleteChatMemory(baulId, memory.id);
  };

  return (
    <ChatMemoriesScreen
      memories={isCurrentBaul ? memories : []}
      isLoading={isLoading || !isCurrentBaul}
      hasError={isCurrentBaul && hasError}
      onBack={() => navigate(-1)}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  );
};
