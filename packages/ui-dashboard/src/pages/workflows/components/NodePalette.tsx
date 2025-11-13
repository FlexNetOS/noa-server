import React from 'react';

import { motion } from 'framer-motion';

interface NodeType {
  type: string;
  label: string;
  icon: string;
  description: string;
  category: 'control' | 'action' | 'integration';
}

interface NodePaletteProps {
  onNodeDragStart: (type: string, label: string) => void;
}

const nodeTypes: NodeType[] = [
  {
    type: 'start',
    label: 'Start',
    icon: '▶️',
    description: 'Entry point for the workflow',
    category: 'control',
  },
  {
    type: 'task',
    label: 'Task',
    icon: '⚙️',
    description: 'Execute a specific task or operation',
    category: 'action',
  },
  {
    type: 'agent',
    label: 'Agent',
    icon: '🤖',
    description: 'Spawn an AI agent to perform work',
    category: 'action',
  },
  {
    type: 'decision',
    label: 'Decision',
    icon: '❓',
    description: 'Conditional branching based on data',
    category: 'control',
  },
  {
    type: 'parallel',
    label: 'Parallel',
    icon: '⫸',
    description: 'Execute multiple branches concurrently',
    category: 'control',
  },
  {
    type: 'api',
    label: 'API Call',
    icon: '🌐',
    description: 'Make HTTP requests to external APIs',
    category: 'integration',
  },
  {
    type: 'database',
    label: 'Database',
    icon: '💾',
    description: 'Query or update database records',
    category: 'integration',
  },
  {
    type: 'notification',
    label: 'Notification',
    icon: '📧',
    description: 'Send notifications via email/Slack',
    category: 'integration',
  },
  {
    type: 'end',
    label: 'End',
    icon: '🏁',
    description: 'Terminal node for the workflow',
    category: 'control',
  },
];

export function NodePalette({ onNodeDragStart }: NodePaletteProps) {
  const categories = Array.from(new Set(nodeTypes.map((n) => n.category)));

  return (
    <div className="h-full overflow-y-auto border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="p-4">
        <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Node Palette</h3>

        {categories.map((category) => (
          <div key={category} className="mb-6">
            <h4 className="mb-2 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              {category}
            </h4>
            <div className="space-y-2">
              {nodeTypes
                .filter((n) => n.category === category)
                .map((nodeType) => (
                  <motion.div
                    key={nodeType.type}
                    draggable
                    onDragStart={() => onNodeDragStart(nodeType.type, nodeType.label)}
                    whileHover={{ scale: 1.02, x: 4 }}
                    className="group cursor-move rounded-lg bg-gray-50 p-3 transition-colors hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex-none text-2xl" role="img" aria-hidden="true">
                        {nodeType.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {nodeType.label}
                        </div>
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {nodeType.description}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
