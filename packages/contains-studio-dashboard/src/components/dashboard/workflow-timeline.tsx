'use client';

import { format } from 'date-fns';
import { CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn, formatDuration } from '@/lib/utils';
import { Workflow, WorkflowPhase } from '@/types';

interface WorkflowTimelineProps {
  workflow: Workflow;
}

const priorityColors = {
  low: 'text-gray-600 border-gray-600',
  medium: 'text-blue-600 border-blue-600',
  high: 'text-orange-600 border-orange-600',
  critical: 'text-red-600 border-red-600',
};

const phaseIcons = {
  pending: Circle,
  'in-progress': Clock,
  completed: CheckCircle2,
  failed: AlertCircle,
};

export function WorkflowTimeline({ workflow }: WorkflowTimelineProps) {
  const progress =
    (workflow.phases.filter((p) => p.status === 'completed').length / workflow.phases.length) * 100;

  return (
    <Card className="transition-shadow hover:shadow-lg">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl">{workflow.title}</CardTitle>
            <CardDescription className="mt-2">{workflow.description}</CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant="outline" className={cn('text-xs', priorityColors[workflow.priority])}>
              {workflow.priority}
            </Badge>
            <Badge variant={workflow.status === 'completed' ? 'default' : 'secondary'}>
              {workflow.status}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium">{progress.toFixed(0)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Created</p>
            <p className="font-medium">{format(workflow.createdAt, 'PPp')}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Expected Completion</p>
            <p className="font-medium">{format(workflow.estimatedCompletion, 'PPp')}</p>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-semibold">Workflow Phases</h4>
          <div className="space-y-3">
            {workflow.phases.map((phase, index) => {
              const Icon = phaseIcons[phase.status];
              const isActive = workflow.currentPhase === phase.name;

              return (
                <div
                  key={index}
                  className={cn(
                    'flex items-start gap-3 rounded-lg p-3 transition-colors',
                    isActive && 'border border-primary/20 bg-primary/5'
                  )}
                >
                  <Icon
                    className={cn(
                      'mt-0.5 h-5 w-5',
                      phase.status === 'completed' && 'text-green-600',
                      phase.status === 'in-progress' && 'text-blue-600',
                      phase.status === 'failed' && 'text-red-600',
                      phase.status === 'pending' && 'text-gray-400'
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className={cn('text-sm font-medium', isActive && 'text-primary')}>
                        {phase.name}
                      </p>
                      {phase.actualDuration && (
                        <span className="text-xs text-muted-foreground">
                          {formatDuration(phase.actualDuration)}
                        </span>
                      )}
                    </div>
                    {phase.assignedAgents.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {phase.assignedAgents.map((agent) => (
                          <Badge key={agent} variant="outline" className="text-xs">
                            {agent}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {workflow.requirements.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Requirements</h4>
            <ul className="space-y-1 text-sm">
              {workflow.requirements.map((req, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span className="text-muted-foreground">{req}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
