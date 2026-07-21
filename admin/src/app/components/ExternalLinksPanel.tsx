import { ExternalLink as ExternalLinkIcon } from 'lucide-react';
import type { ExternalLink } from '@/types';

interface ExternalLinksPanelProps {
  links: ExternalLink[];
}

export function ExternalLinksPanel({ links }: ExternalLinksPanelProps) {
  if (links.length === 0) return null;

  return (
    <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
      <h3 className="mb-4">Herramientas</h3>
      <div className="flex flex-wrap gap-3">
        {links.map((link) => (
          <a
            key={link.label}
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm hover:opacity-80 transition-opacity"
          >
            {link.label}
            <ExternalLinkIcon className="w-3.5 h-3.5" />
          </a>
        ))}
      </div>
    </div>
  );
}
