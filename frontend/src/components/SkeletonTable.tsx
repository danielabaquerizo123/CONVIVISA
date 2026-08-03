import React from 'react';

interface SkeletonTableProps {
  cols?: number;
  rows?: number;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  cols = 5,
  rows = 4,
}) => {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-10 bg-brand-secondary/15 rounded w-full" />
      {[...Array(rows)].map((_, rIdx) => (
        <div key={rIdx} className="flex gap-4 items-center py-4 border-b border-brand-secondary/10">
          {[...Array(cols)].map((_, cIdx) => (
            <div key={cIdx} className="h-6 bg-brand-secondary/10 rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
};
