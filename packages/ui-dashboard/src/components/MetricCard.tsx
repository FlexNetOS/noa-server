import type { ReactNode } from 'react';

import { motion } from 'framer-motion';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  status?: 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  status,
  className = '',
}: MetricCardProps) {
  const statusColors = {
    success: 'border-brand-success/30 bg-brand-success/5',
    warning: 'border-brand-warning/30 bg-brand-warning/5',
    danger: 'border-brand-danger/30 bg-brand-danger/5',
    info: 'border-brand-info/30 bg-brand-info/5',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`rounded-lg border border-brand-border bg-brand-card p-6 ${status ? statusColors[status] : ''} ${className}`}
    >
      <div className="mb-2 flex items-start justify-between">
        <h3 className="text-sm font-medium uppercase tracking-wide text-brand-muted">{title}</h3>
        {icon && <div className="text-brand-accent">{icon}</div>}
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="mb-1 text-3xl font-bold text-white">{value}</p>
          {subtitle && <p className="text-sm text-brand-muted">{subtitle}</p>}
        </div>

        {trend && (
          <div
            className={`flex items-center text-sm font-medium ${trend.isPositive ? 'text-brand-success' : 'text-brand-danger'}`}
          >
            <span className="mr-1">{trend.isPositive ? '↑' : '↓'}</span>
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
    </motion.div>
  );
}
