import React from 'react';
import { Card, CardContent } from '../ui/card';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    type: 'up' | 'down' | 'neutral';
    value: string;
  };
  colorClass?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  description,
  trend,
  colorClass = 'text-indigo-500'
}) => {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="glass-card shadow-lg hover:shadow-indigo-500/5 transition-all duration-300">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-400">{title}</p>
            <div className={`p-2 rounded-lg bg-slate-800/80 ${colorClass}`}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold tracking-tight text-slate-50">{value}</h3>
            {trend && (
              <p className="mt-1 text-xs flex items-center">
                <span
                  className={
                    trend.type === 'up'
                      ? 'text-emerald-400'
                      : trend.type === 'down'
                      ? 'text-red-400'
                      : 'text-slate-400'
                  }
                >
                  {trend.value}
                </span>
                <span className="text-slate-500 ml-1.5">{description || 'vs last month'}</span>
              </p>
            )}
            {!trend && description && (
              <p className="mt-1 text-xs text-slate-500">{description}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
