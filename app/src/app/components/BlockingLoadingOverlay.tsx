import { LoadingSpinner } from './LoadingSpinner';

interface BlockingLoadingOverlayProps {
  message: string;
}

export function BlockingLoadingOverlay({ message }: BlockingLoadingOverlayProps) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-card rounded-2xl p-8 shadow-2xl border border-border">
        <LoadingSpinner message={message} size="lg" />
      </div>
    </div>
  );
}
