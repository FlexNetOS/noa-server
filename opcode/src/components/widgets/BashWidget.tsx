import React from 'react';
import { Terminal, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BashWidgetProps {
  command: string;
  description?: string;
  result?: any;
}

export const BashWidget: React.FC<BashWidgetProps> = ({ command, description, result }) => {
  // Extract result content if available
  let resultContent = '';
  let isError = false;

  if (result) {
    isError = result.is_error || false;
    if (typeof result.content === 'string') {
      resultContent = result.content;
    } else if (result.content && typeof result.content === 'object') {
      if (result.content.text) {
        resultContent = result.content.text;
      } else if (Array.isArray(result.content)) {
        resultContent = result.content
          .map((c: any) => (typeof c === 'string' ? c : c.text || JSON.stringify(c)))
          .join('\n');
      } else {
        resultContent = JSON.stringify(result.content, null, 2);
      }
    }
  }

  return (
    <div className="bg-background overflow-hidden rounded-lg border">
      <div className="bg-muted/50 flex items-center gap-2 border-b px-4 py-2">
        <Terminal className="h-3.5 w-3.5 text-green-500" />
        <span className="text-muted-foreground font-mono text-xs">Terminal</span>
        {description && (
          <>
            <ChevronRight className="text-muted-foreground h-3 w-3" />
            <span className="text-muted-foreground text-xs">{description}</span>
          </>
        )}
        {/* Show loading indicator when no result yet */}
        {!result && (
          <div className="text-muted-foreground ml-auto flex items-center gap-1 text-xs">
            <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            <span>Running...</span>
          </div>
        )}
      </div>
      <div className="space-y-3 p-4">
        <code className="block font-mono text-xs text-green-400">$ {command}</code>

        {/* Show result if available */}
        {result && (
          <div
            className={cn(
              'mt-3 overflow-x-auto rounded-md border p-3 font-mono text-xs whitespace-pre-wrap',
              isError
                ? 'border-[color:var(--color-destructive)]/20 bg-[color:var(--color-destructive)]/5 text-[color:var(--color-destructive)]'
                : 'border-[color:var(--color-green-500)]/20 bg-[color:var(--color-green-500)]/5 text-[color:var(--color-green-500)]'
            )}
          >
            {resultContent || (isError ? 'Command failed' : 'Command completed')}
          </div>
        )}
      </div>
    </div>
  );
};
