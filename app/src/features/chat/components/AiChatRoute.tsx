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
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  useEffect(() => {
    if (!baulId) return;
    api.chat.getMessages(baulId)
      .then((history) => {
        setMessages(history);
        if (history.length === 0) {
          setIsLoadingSuggestions(true);
          api.chat.getSuggestedQuestions(baulId)
            .then(setSuggestions)
            .catch(() => setSuggestions([]))
            .finally(() => setIsLoadingSuggestions(false));
        }
      })
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
      suggestions={suggestions}
      isLoadingSuggestions={isLoadingSuggestions}
      onBack={() => navigate(-1)}
      onSend={handleSend}
    />
  );
};
