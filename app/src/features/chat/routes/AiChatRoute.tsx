import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AiChatScreen } from '@/features/chat/components/AiChatScreen';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { useChatStore } from '@/store/useChatStore';
import { loadChatConversation, sendChatMessage } from '@/features/chat/useCases';

export const AiChatRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baulId } = useParams();
  const chatSuggestionsEnabled = useAppConfigStore(state => state.chatSuggestionsEnabled);
  const {
    activeBaulId,
    messages,
    isLoadingHistory,
    isSending,
    hasError,
    suggestions,
    isLoadingSuggestions,
  } = useChatStore();

  useEffect(() => {
    if (!baulId) return;
    void loadChatConversation(baulId, { suggestionsEnabled: chatSuggestionsEnabled });
  }, [baulId, chatSuggestionsEnabled]);

  const handleSend = async (text: string) => {
    if (!baulId) return;
    await sendChatMessage(baulId, text);
  };

  const isCurrentBaul = baulId === activeBaulId;

  return (
    <AiChatScreen
      messages={isCurrentBaul ? messages : []}
      isLoadingHistory={isLoadingHistory || !isCurrentBaul}
      isSending={isSending}
      hasError={hasError}
      suggestions={isCurrentBaul ? suggestions : []}
      isLoadingSuggestions={isCurrentBaul && isLoadingSuggestions}
      onBack={() => navigate(-1)}
      onSend={handleSend}
    />
  );
};
