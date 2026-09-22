import React from 'react';
import { ImageIcon } from 'lucide-react';
import { Button } from '@/design-system/components/actions/Button';

export interface ContentCardCounter {
  icon: React.ReactNode;
  label: string;
}

interface ContentCardProps {
  title: string;
  coverImageUrl?: string;
  subtitle?: string;
  counters?: ContentCardCounter[];
  onClick: () => void;
}

// Shared visual language for "a piece of content with a cover photo" (Capítulo, Baúl, and now
// device albums) — image to the edge + gradient, w-full h-52, title top-left, icon+count
// metadata bottom-right. See docs/DESIGN.md's "Baúl as workspace" section. Domain-specific cards
// (ChapterCard, DeviceAlbumCard, ...) map their own model onto these props rather than
// duplicating this layout.
export function ContentCard({ title, coverImageUrl, subtitle, counters = [], onClick }: ContentCardProps) {
  return (
    <Button variant="plain"
      onClick={onClick}
      className="relative w-full h-52 rounded-2xl overflow-hidden text-left shadow-sm active:scale-[0.98] transition-transform"
    >
      {/* Background photo */}
      <div className="absolute inset-0 bg-secondary">
        {coverImageUrl ? (
          <img src={coverImageUrl} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-16 h-16 text-muted-foreground opacity-40" strokeWidth={1.5} />
          </div>
        )}
      </div>

      {/* Gradient overlay — solid enough for legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/20 to-black/75" />

      {/* Top-left: title + subtitle */}
      <div className="absolute top-4 left-4 right-4">
        <h3 className="font-serif text-white text-xl leading-tight drop-shadow line-clamp-2">
          {title}
        </h3>
        {subtitle && (
          <p className="text-white/90 text-xs mt-0.5 drop-shadow-sm">
            {subtitle}
          </p>
        )}
      </div>

      {/* Bottom-right: counters */}
      <div className="absolute bottom-4 right-4 flex flex-col items-end gap-1.5">
        {counters.map((counter, i) => (
          <div key={i} className="flex items-center gap-1 text-white/90 text-xs drop-shadow-sm">
            <span className="w-3 h-3 -translate-y-px [&>svg]:w-3 [&>svg]:h-3">{counter.icon}</span>
            <span>{counter.label}</span>
          </div>
        ))}
      </div>
    </Button>
  );
}
