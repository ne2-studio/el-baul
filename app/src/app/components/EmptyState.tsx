import React from 'react';

interface EmptyStateProps {
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
}

export function EmptyState({ title, subtitle, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      {icon && (
        <div className="mb-4 text-muted-foreground opacity-40">
          {icon}
        </div>
      )}
      <h3 className="text-xl mb-2 text-foreground">{title}</h3>
      <p className="text-muted-foreground max-w-sm">{subtitle}</p>
    </div>
  );
}
