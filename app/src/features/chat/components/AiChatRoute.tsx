import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AiChatScreen } from '@/app/components/AiChatScreen';
import { api } from '@/api';
import { ChatMessage } from '@/types';

export const AiChatRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baulId } = useParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!baulId) return;
    api.chat.getMessages(baulId)
      .then(setMessages)
      .catch(() => setHasError(true))
      .finally(() => setIsLoadingHistory(false));
  }, [baulId]);

  const handleSend = async (text: string) => {
    if (!baulId) return;

    setMessages((prev) => [
      ...prev,
      new ChatMessage({ id: crypto.randomUUID(), role: 'user', content: text, createdAt: new Date().toISOString() }),
    ]);
    setIsSending(true);
    setHasError(false);
    try {
      const reply = await api.chat.sendMessage(baulId, text);
      setMessages((prev) => [...prev, reply]);
    } catch {
      setHasError(true);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AiChatScreen
      messages={messages}
      isLoadingHistory={isLoadingHistory}
      isSending={isSending}
      hasError={hasError}
      onBack={() => navigate(-1)}
      onSend={handleSend}
    />
  );
};
