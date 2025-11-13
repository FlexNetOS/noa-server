/**
 * Reusable Metric Card Component
 * Displays individual metric with title, value, and trend indicator
 */

import React from 'react';
import clsx from 'clsx';

export interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}

const colorClasses = {
  blue: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700',
  green: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700',
  yellow: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700',
  red: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700',
  purple: 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-700',
  gray: 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
};

const iconColorClasses = {
  blue: 'text-blue-600 dark:text-blue-400',
  green: 'text-green-600 dark:text-green-400',
  yellow: 'text-yellow-600 dark:text-yellow-400',
  red: 'text-red-600 dark:text-red-400',
  purple: 'text-purple-600 dark:text-purple-400',
  gray: 'text-gray-600 dark:text-gray-400'
};

const sizeClasses = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6'
};

const valueSizeClasses = {
  sm: 'text-xl',
  md: 'text-2xl',
  lg: 'text-3xl'
};

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  trend,
  trendValue,
  icon,
  color = 'gray',
  size = 'md',
  loading = false,
  onClick,
  className
}) => {
  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600';

  return (
    <div
      className={clsx(
        'rounded-lg border-2 transition-all duration-200',
        colorClasses[color],
        sizeClasses[size],
        onClick && 'cursor-pointer hover:shadow-lg',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            {title}
          </p>

          {loading ? (
            <div className="animate-pulse">
              <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-24 mb-2"></div>
              <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-16"></div>
            </div>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className={clsx(
                  'font-bold text-gray-900 dark:text-white',
                  valueSizeClasses[size]
                )}>
                  {value}
                </span>
                {unit && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {unit}
                  </span>
                )}
              </div>

              {(subtitle || trendValue) && (
                <div className="mt-2 flex items-center gap-2">
                  {trendValue && (
                    <span className={clsx('text-sm font-medium', trendColor)}>
                      {trendIcon} {trendValue}
                    </span>
                  )}
                  {subtitle && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {subtitle}
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {icon && (
          <div className={clsx('text-2xl', iconColorClasses[color])}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricCard;
