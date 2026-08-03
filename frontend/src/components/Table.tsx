import React from 'react';

interface TableProps {
  headers: string[];
  children: React.ReactNode;
  className?: string;
}

export const Table: React.FC<TableProps> = ({
  headers,
  children,
  className = '',
}) => {
  return (
    <div className={`overflow-x-auto border border-brand-secondary/20 rounded-lg shadow-sm ${className}`}>
      <table className="min-w-full divide-y divide-brand-secondary/20 bg-brand-bg text-left text-sm text-brand-text">
        <thead className="bg-[#f0ece3] text-brand-text font-serif">
          <tr>
            {headers.map((header, idx) => (
              <th
                key={idx}
                scope="col"
                className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-brand-text border-b border-brand-secondary/20"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-secondary/15">
          {children}
        </tbody>
      </table>
    </div>
  );
};
