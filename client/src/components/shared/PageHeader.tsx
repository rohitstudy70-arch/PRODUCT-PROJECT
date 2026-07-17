import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, children }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-800/40 mb-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-100">{title}</h1>
        {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
      </div>
      {children && (
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          {children}
        </div>
      )}
    </div>
  );
};
