import { useEffect, useState } from 'react';

import { motion } from 'framer-motion';

import type { AgentStatus } from '@/types';

interface SwarmVisualizationProps {
  agents: AgentStatus[];
}

interface AgentNode {
  id: string;
  x: number;
  y: number;
  status: AgentStatus['status'];
  connections: string[];
}

export function SwarmVisualization({ agents }: SwarmVisualizationProps) {
  const [nodes, setNodes] = useState<AgentNode[]>([]);
  const width = 600;
  const height = 400;

  useEffect(() => {
    // Generate circular layout for agents
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.35;

    const newNodes: AgentNode[] = agents.map((agent, index) => {
      const angle = (index / agents.length) * Math.PI * 2 - Math.PI / 2;
      return {
        id: agent.id,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        status: agent.status,
        connections: agents
          .filter((_, i) => i !== index && Math.random() > 0.7) // Random connections
          .map((a) => a.id),
      };
    });

    setNodes(newNodes);
  }, [agents]);

  const getNodeColor = (status: AgentStatus['status']) => {
    const colors = {
      running: '#22c55e',
      idle: '#94a3b8',
      error: '#ef4444',
      paused: '#facc15',
    };
    return colors[status];
  };

  return (
    <div className="rounded-lg border border-brand-border bg-brand-card p-6">
      <h2 className="mb-4 text-xl font-bold text-white">Agent Swarm Network</h2>

      <div
        className="relative overflow-hidden rounded-lg bg-brand-bg/50"
        style={{ height: `${height}px` }}
      >
        <svg width={width} height={height} className="h-full w-full">
          {/* Connection lines */}
          {nodes.map((node) =>
            node.connections.map((connId) => {
              const connNode = nodes.find((n) => n.id === connId);
              if (!connNode) {
                return null;
              }
              return (
                <motion.line
                  key={`${node.id}-${connId}`}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.2 }}
                  transition={{ duration: 1 }}
                  x1={node.x}
                  y1={node.y}
                  x2={connNode.x}
                  y2={connNode.y}
                  stroke="#334155"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              );
            })
          )}

          {/* Agent nodes */}
          {nodes.map((node, index) => (
            <g key={node.id}>
              <motion.circle
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                cx={node.x}
                cy={node.y}
                r="20"
                fill={getNodeColor(node.status)}
                className="cursor-pointer"
              >
                <animate
                  attributeName="r"
                  values={node.status === 'running' ? '20;24;20' : '20'}
                  dur="2s"
                  repeatCount="indefinite"
                />
              </motion.circle>

              <motion.circle
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.05 + 0.1 }}
                cx={node.x}
                cy={node.y}
                r="15"
                fill={`${getNodeColor(node.status)}40`}
              />

              <text
                x={node.x}
                y={node.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="pointer-events-none fill-white text-xs font-medium"
              >
                {index + 1}
              </text>
            </g>
          ))}
        </svg>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 flex gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-brand-success" />
            <span className="text-white">Running</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-brand-muted" />
            <span className="text-white">Idle</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-brand-warning" />
            <span className="text-white">Paused</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-brand-danger" />
            <span className="text-white">Error</span>
          </div>
        </div>
      </div>
    </div>
  );
}
