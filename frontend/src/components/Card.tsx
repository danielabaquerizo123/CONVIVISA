import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  subtitle,
}) => {
  return (
    <div className={`bg-brand-bg border border-brand-secondary/25 rounded-lg shadow-sm p-6 ${className}`}>
      {(title || subtitle) && (
        <div className="mb-4 border-b border-brand-secondary/15 pb-3">
          {title && <h3 className="text-lg font-semibold text-brand-text font-serif">{title}</h3>}
          {subtitle && <p className="text-xs text-brand-secondary mt-1">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
};
