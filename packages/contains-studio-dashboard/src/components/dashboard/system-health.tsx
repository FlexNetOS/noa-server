'use client';

import { Activity, Cpu, Database, HardDrive, Network, Server } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn, formatBytes, formatDuration, formatPercentage } from '@/lib/utils';
import { SystemState } from '@/types';

interface SystemHealthProps {
  systemState: SystemState;
}

export function SystemHealth({ systemState }: SystemHealthProps) {
  const metrics = [
    {
      name: 'CPU Usage',
      value: systemState.systemHealth.cpu,
      icon: Cpu,
      color: 'text-blue-600',
      threshold: 80,
    },
    {
      name: 'Memory Usage',
      value: systemState.systemHealth.memory,
      icon: Database,
      color: 'text-green-600',
      threshold: 85,
    },
    {
      name: 'Disk Usage',
      value: systemState.systemHealth.disk,
      icon: HardDrive,
      color: 'text-purple-600',
      threshold: 90,
    },
    {
      name: 'Network Usage',
      value: systemState.systemHealth.network,
      icon: Network,
      color: 'text-orange-600',
      threshold: 75,
    },
  ];

  const overallHealth = metrics.every((m) => m.value < m.threshold)
    ? 'healthy'
    : metrics.some((m) => m.value >= m.threshold)
      ? 'degraded'
      : 'healthy';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                System Health
              </CardTitle>
              <CardDescription className="mt-2">
                Real-time system metrics and service status
              </CardDescription>
            </div>
            <Badge
              variant={overallHealth === 'healthy' ? 'default' : 'destructive'}
              className="h-8"
            >
              {overallHealth === 'healthy' ? '✓ Healthy' : '⚠ Degraded'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              const isWarning = metric.value >= metric.threshold;

              return (
                <Card key={metric.name} className={cn(isWarning && 'border-destructive')}>
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-center justify-between">
                      <Icon className={cn('h-4 w-4', metric.color)} />
                      <span className={cn('text-xs font-medium', isWarning && 'text-destructive')}>
                        {formatPercentage(metric.value)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{metric.name}</p>
                    <Progress
                      value={metric.value}
                      className={cn('h-1.5', isWarning && '[&>div]:bg-destructive')}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Active Agents</p>
              <p className="text-2xl font-bold">
                {systemState.activeAgents}/{systemState.agents}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Active Workflows</p>
              <p className="text-2xl font-bold">
                {systemState.activeWorkflows}/{systemState.workflows}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">System Uptime</p>
              <p className="text-2xl font-bold">{formatDuration(systemState.uptime)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Version</p>
              <p className="text-2xl font-bold">{systemState.version}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Docker Services
          </CardTitle>
          <CardDescription>Status of infrastructure services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {systemState.services.map((service) => (
              <div
                key={service.name}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'h-2 w-2 rounded-full',
                      service.status === 'healthy' && 'bg-green-500',
                      service.status === 'degraded' && 'bg-yellow-500',
                      service.status === 'down' && 'bg-red-500'
                    )}
                  />
                  <div>
                    <p className="text-sm font-medium">{service.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Uptime: {formatDuration(service.uptime)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={service.status === 'healthy' ? 'default' : 'destructive'}>
                    {service.status}
                  </Badge>
                  <p className="mt-1 text-xs text-muted-foreground">{service.responseTime}ms</p>
                </div>
              </div>
            ))}
            {systemState.services.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No services configured
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
