import React from 'react';
import { Icon } from '@/design-system/foundations/icons/Icon';
import { icons } from '@/design-system/foundations/icons/icons';
import { Button } from '@/design-system/components/actions/Button';
import { cn } from '@/design-system/components/ui/utils';

interface AttentionBannerProps {
  message: string;
  ctaLabel: string;
  dismissLabel: string;
  onCta: () => void;
  onDismiss: () => void;
  className?: string;
}

/**
 * A reusable, dismissible callout for something that needs the person's attention right now
 * (as opposed to Notice, which is a static, non-dismissible aside). Visibility is fully
 * controlled by the caller — this component has no internal open/closed state — so whether a
 * dismissal is remembered, and for how long, is a decision each caller makes for itself.
 */
export function AttentionBanner({ message, ctaLabel, dismissLabel, onCta, onDismiss, className }: AttentionBannerProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-secondary px-4 py-3.5',
        className,
      )}
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-card text-primary">
        <Icon icon={icons.users} size="md" aria-hidden />
      </div>
      <p className="min-w-[220px] flex-1 text-sm text-foreground">{message}</p>
      <div className="ml-auto flex flex-shrink-0 items-center gap-2">
        <Button variant="ghost" onClick={onDismiss} className="px-4 py-2 text-sm">
          {dismissLabel}
        </Button>
        <Button variant="primary" onClick={onCta} className="px-4 py-2 text-sm">
          {ctaLabel}
        </Button>
      </div>
    </div>
  );
}
