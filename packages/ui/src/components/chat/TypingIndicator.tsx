/**
 * TypingIndicator Component
 * Animated typing indicator for streaming responses
 */

import React from 'react';
import { motion } from 'framer-motion';
import type { TypingIndicatorProps } from '../../types/chat';

const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  className = '',
  variant = 'dots'
}) => {
  if (variant === 'pulse') {
    return (
      <div className={`typing-indicator-pulse ${className}`}>
        <motion.div
          className="pulse-dot"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
      </div>
    );
  }

  if (variant === 'wave') {
    return (
      <div className={`typing-indicator-wave ${className}`}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="wave-bar"
            animate={{
              scaleY: [1, 1.5, 1]
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.15,
              ease: 'easeInOut'
            }}
          />
        ))}
      </div>
    );
  }

  // Default: dots variant
  return (
    <div className={`typing-indicator ${className}`} role="status" aria-label="Assistant is typing">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="typing-dot"
          animate={{
            y: [0, -8, 0],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut'
          }}
        />
      ))}
    </div>
  );
};

export default TypingIndicator;
