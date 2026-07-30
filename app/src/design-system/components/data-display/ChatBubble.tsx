import { ChatMessage } from '@/types';
import { cn } from '@/design-system/components/ui/utils';
import type React from 'react';

interface ChatBubbleProps {
  role: ChatMessage['role'];
  children: React.ReactNode;
  className?: string;
}

export function ChatBubble({ role, children, className }: ChatBubbleProps) {
  const isUser = role === 'user';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap',
          isUser ? 'bg-primary text-primary-foreground' : 'border border-border bg-card text-foreground',
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
