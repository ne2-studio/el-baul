interface ErrorScreenProps {
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
}

export function ErrorScreen({ title, message, actionLabel, onAction }: ErrorScreenProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-card rounded-2xl p-8 shadow-xl border border-border max-w-md w-full">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          <p className="text-muted-foreground">{message}</p>
          <button
            onClick={onAction}
            className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-full font-medium hover:opacity-90 transition-opacity"
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
