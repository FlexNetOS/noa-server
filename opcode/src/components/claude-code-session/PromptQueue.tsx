import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface QueuedPrompt {
  id: string;
  prompt: string;
  model: 'sonnet' | 'opus';
}

interface PromptQueueProps {
  queuedPrompts: QueuedPrompt[];
  onRemove: (id: string) => void;
  className?: string;
}

export const PromptQueue: React.FC<PromptQueueProps> = React.memo(
  ({ queuedPrompts, onRemove, className }) => {
    if (queuedPrompts.length === 0) return null;

    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className={cn('bg-muted/20 border-t', className)}
      >
        <div className="px-4 py-3">
          <div className="mb-2 flex items-center gap-2">
            <Clock className="text-muted-foreground h-4 w-4" />
            <span className="text-sm font-medium">Queued Prompts</span>
            <Badge variant="secondary" className="text-xs">
              {queuedPrompts.length}
            </Badge>
          </div>

          <div className="max-h-32 space-y-2 overflow-y-auto">
            <AnimatePresence mode="popLayout">
              {queuedPrompts.map((queuedPrompt, index) => (
                <motion.div
                  key={queuedPrompt.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-background/50 flex items-start gap-2 rounded-md p-2"
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {queuedPrompt.model === 'opus' ? (
                      <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                    ) : (
                      <Zap className="h-3.5 w-3.5 text-amber-500" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{queuedPrompt.prompt}</p>
                    <span className="text-muted-foreground text-xs">
                      {queuedPrompt.model === 'opus' ? 'Opus' : 'Sonnet'}
                    </span>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 flex-shrink-0"
                    onClick={() => onRemove(queuedPrompt.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    );
  }
);
