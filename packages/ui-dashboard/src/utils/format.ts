// Utility functions for formatting data
import { formatDistanceToNow, format } from 'date-fns';

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return '0 B';
  }
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  if (ms < 3600000) {
    return `${(ms / 60000).toFixed(1)}m`;
  }
  return `${(ms / 3600000).toFixed(1)}h`;
}

export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'MMM dd, yyyy HH:mm:ss');
}

export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    healthy: 'text-brand-success',
    degraded: 'text-brand-warning',
    unhealthy: 'text-brand-danger',
    running: 'text-brand-success',
    idle: 'text-brand-muted',
    error: 'text-brand-danger',
    paused: 'text-brand-warning',
    pending: 'text-brand-info',
    completed: 'text-brand-success',
    failed: 'text-brand-danger',
  };
  return colors[status] || 'text-gray-400';
}

export function getStatusBadgeClass(status: string): string {
  const classes: Record<string, string> = {
    healthy: 'bg-green-500/20 text-green-400 border-green-500/30',
    degraded: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    unhealthy: 'bg-red-500/20 text-red-400 border-red-500/30',
    running: 'bg-green-500/20 text-green-400 border-green-500/30',
    idle: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    error: 'bg-red-500/20 text-red-400 border-red-500/30',
    paused: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    pending: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    completed: 'bg-green-500/20 text-green-400 border-green-500/30',
    failed: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  return classes[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
}
