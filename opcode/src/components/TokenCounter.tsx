import React from 'react';
import { motion } from 'framer-motion';
import { Hash } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TokenCounterProps {
  /**
   * Total number of tokens
   */
  tokens: number;
  /**
   * Whether to show the counter
   */
  show?: boolean;
  /**
   * Optional className for styling
   */
  className?: string;
}

/**
 * TokenCounter component - Displays a floating token count
 *
 * @example
 * <TokenCounter tokens={1234} show={true} />
 */
export const TokenCounter: React.FC<TokenCounterProps> = ({ tokens, show = true, className }) => {
  if (!show || tokens === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={cn(
        'fixed right-4 bottom-20 z-30',
        'bg-background/90 backdrop-blur-sm',
        'border-border rounded-full border',
        'px-3 py-1.5 shadow-lg',
        className
      )}
    >
      <div className="flex items-center gap-1.5 text-xs">
        <Hash className="text-muted-foreground h-3 w-3" />
        <span className="font-mono">{tokens.toLocaleString()}</span>
        <span className="text-muted-foreground">tokens</span>
      </div>
    </motion.div>
  );
};
