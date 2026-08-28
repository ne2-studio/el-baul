import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChatMemoriesScreen } from '@/features/chat/components/ChatMemoriesScreen';
import { deleteChatMemory, loadChatMemories, updateChatMemory } from '@/features/chat/useCases';
import { useChatMemoriesStore } from '@/store/useChatMemoriesStore';
import { ChatMemory } from '@/types';
import { usePostHog } from 'posthog-js/react';

export const ChatMemoriesRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baulId } = useParams();
  const { baulId: activeBaulId, memories, isLoading, hasError } = useChatMemoriesStore();
  const posthog = usePostHog();

  useEffect(() => {
    if (!baulId) return;
    void loadChatMemories(baulId);
  }, [baulId]);

  const isCurrentBaul = baulId === activeBaulId;

  const handleEdit = async (memory: ChatMemory, content: string) => {
    if (!baulId) return false;
    const ok = await updateChatMemory(baulId, memory.id, content);
    if (ok) posthog.capture('chat_memory_edited');
    return ok;
  };

  const handleDelete = async (memory: ChatMemory) => {
    if (!baulId) return false;
    const ok = await deleteChatMemory(baulId, memory.id);
    if (ok) posthog.capture('chat_memory_deleted');
    return ok;
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
