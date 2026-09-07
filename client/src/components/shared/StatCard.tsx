import React from 'react';
import { Card, CardContent } from '../ui/card';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
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
      className="hover:glow-indigo rounded-xl"
    >
      <Card className="glass-card-premium shadow-lg hover:shadow-indigo-500/10 transition-all duration-300">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-muted-foreground">{title}</p>
            <div className={`p-2 rounded-lg bg-slate-100/50 dark:bg-slate-800/80 shadow-[0_0_15px_rgba(0,0,0,0.1)] relative overflow-hidden ${colorClass}`}>
              <div className="absolute inset-0 opacity-20 bg-current blur-md"></div>
              <Icon className="h-5 w-5 relative z-10" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold tracking-tight text-foreground">{value}</h3>
            {trend && (
              <p className="mt-1 text-xs flex items-center">
                <span
                  className={`flex items-center ${
                    trend.type === 'up'
                      ? 'text-emerald-400'
                      : trend.type === 'down'
                      ? 'text-red-400'
                      : 'text-slate-400'
                  }`}
                >
                  {trend.type === 'up' && <TrendingUp className="w-3 h-3 mr-1" />}
                  {trend.type === 'down' && <TrendingDown className="w-3 h-3 mr-1" />}
                  {trend.type === 'neutral' && <Minus className="w-3 h-3 mr-1" />}
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
