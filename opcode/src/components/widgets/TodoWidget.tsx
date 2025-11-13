import React from 'react';
import { CheckCircle2, Circle, Clock, FileEdit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TodoWidgetProps {
  todos: any[];
  result?: any;
}

export const TodoWidget: React.FC<TodoWidgetProps> = ({ todos, result: _result }) => {
  const statusIcons = {
    completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    in_progress: <Clock className="h-4 w-4 animate-pulse text-blue-500" />,
    pending: <Circle className="text-muted-foreground h-4 w-4" />,
  };

  const priorityColors = {
    high: 'bg-red-500/10 text-red-500 border-red-500/20',
    medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    low: 'bg-green-500/10 text-green-500 border-green-500/20',
  };

  return (
    <div className="space-y-2">
      <div className="mb-3 flex items-center gap-2">
        <FileEdit className="text-primary h-4 w-4" />
        <span className="text-sm font-medium">Todo List</span>
      </div>
      <div className="space-y-2">
        {todos.map((todo, idx) => (
          <div
            key={todo.id || idx}
            className={cn(
              'bg-card/50 flex items-start gap-3 rounded-lg border p-3',
              todo.status === 'completed' && 'opacity-60'
            )}
          >
            <div className="mt-0.5">
              {statusIcons[todo.status as keyof typeof statusIcons] || statusIcons.pending}
            </div>
            <div className="flex-1 space-y-1">
              <p className={cn('text-sm', todo.status === 'completed' && 'line-through')}>
                {todo.content}
              </p>
              {todo.priority && (
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs',
                    priorityColors[todo.priority as keyof typeof priorityColors]
                  )}
                >
                  {todo.priority}
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
