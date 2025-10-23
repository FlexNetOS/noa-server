'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Agent } from '@/types';

interface AgentCardProps {
  agent: Agent;
}

const statusColors = {
  idle: 'bg-gray-500',
  active: 'bg-green-500',
  busy: 'bg-yellow-500',
  error: 'bg-red-500',
};

const domainColors: Record<string, string> = {
  engineering: 'text-blue-600 border-blue-600',
  design: 'text-purple-600 border-purple-600',
  marketing: 'text-pink-600 border-pink-600',
  product: 'text-green-600 border-green-600',
  'project-management': 'text-orange-600 border-orange-600',
  'studio-operations': 'text-teal-600 border-teal-600',
  testing: 'text-red-600 border-red-600',
  bonus: 'text-indigo-600 border-indigo-600',
};

export function AgentCard({ agent }: AgentCardProps) {
  const efficiency = agent.tasksCompleted > 0 ? Math.min(100, (agent.averageTime / 1000) * 10) : 0;

  return (
    <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
      <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: agent.color }} />

      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{agent.name}</CardTitle>
            <CardDescription className="mt-1 text-sm line-clamp-2">
              {agent.description}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant="outline" className={cn('text-xs', domainColors[agent.domain])}>
              {agent.domain}
            </Badge>
            <div className={cn('w-2 h-2 rounded-full', statusColors[agent.status])} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {agent.currentTask && (
          <div className="p-2 bg-muted rounded-md text-sm">
            <p className="font-medium text-muted-foreground">Current Task:</p>
            <p className="line-clamp-1">{agent.currentTask}</p>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Efficiency</span>
            <span className="font-medium">{efficiency.toFixed(0)}%</span>
          </div>
          <Progress value={efficiency} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Tasks Completed</p>
            <p className="font-bold text-lg">{agent.tasksCompleted}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Avg Time</p>
            <p className="font-bold text-lg">{(agent.averageTime / 1000).toFixed(1)}s</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {agent.capabilities.slice(0, 3).map((capability) => (
            <Badge key={capability} variant="secondary" className="text-xs">
              {capability.replace(/_/g, ' ')}
            </Badge>
          ))}
          {agent.capabilities.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{agent.capabilities.length - 3} more
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
