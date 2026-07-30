import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, children }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 gradient-border-b mb-6 page-enter">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-gradient">{title}</h1>
        {subtitle && (
          <div className="flex items-center mt-1">
            <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 mr-2"></div>
            <p className="text-sm text-slate-400">{subtitle}</p>
          </div>
        )}
      </div>
      {children && (
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          {children}
        </div>
      )}
    </div>
  );
};
