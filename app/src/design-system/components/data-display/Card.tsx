import React from 'react';

interface CardProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function Card({ children, onClick, className = '' }: CardProps) {
  const baseStyles = "bg-card rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200";
  const clickableStyles = onClick ? "cursor-pointer" : "";
  
  return (
    <div 
      onClick={onClick}
      className={`${baseStyles} ${clickableStyles} ${className}`}
    >
      {children}
    </div>
  );
}
