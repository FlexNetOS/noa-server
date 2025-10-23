import React, { useRef } from 'react';

import { motion } from 'framer-motion';

import type { WorkflowNode, WorkflowEdge } from '../../../types/workflow';

interface WorkflowCanvasProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNode: WorkflowNode | null;
  onDrop: (e: React.DragEvent) => void;
  onNodeClick: (node: WorkflowNode) => void;
  onNodeMove: (nodeId: string, x: number, y: number) => void;
}

export function WorkflowCanvas({
  nodes,
  edges,
  selectedNode,
  onDrop,
  onNodeClick,
  onNodeMove,
}: WorkflowCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);

  const getNodeIcon = (type: string) => {
    const icons: Record<string, string> = {
      start: '▶️',
      task: '⚙️',
      agent: '🤖',
      decision: '❓',
      parallel: '⫸',
      api: '🌐',
      database: '💾',
      notification: '📧',
      end: '🏁',
    };
    return icons[type] || '📦';
  };

  const getNodeColor = (type: string) => {
    const colors: Record<string, string> = {
      start: 'border-green-500 bg-green-50 dark:bg-green-900/20',
      task: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
      agent: 'border-purple-500 bg-purple-50 dark:bg-purple-900/20',
      decision: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
      parallel: 'border-orange-500 bg-orange-50 dark:bg-orange-900/20',
      api: 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20',
      database: 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20',
      notification: 'border-pink-500 bg-pink-50 dark:bg-pink-900/20',
      end: 'border-red-500 bg-red-50 dark:bg-red-900/20',
    };
    return colors[type] || 'border-gray-500 bg-gray-50 dark:bg-gray-900/20';
  };

  return (
    <div
      ref={canvasRef}
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
      className="relative w-full h-full overflow-auto bg-gray-50 dark:bg-gray-900"
      style={{
        backgroundImage: `radial-gradient(circle, #cbd5e1 1px, transparent 1px)`,
        backgroundSize: '20px 20px',
      }}
    >
      {/* Canvas content area */}
      <div className="relative min-w-[2000px] min-h-[2000px]">
        {/* Render edges */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="#3b82f6" />
            </marker>
            <marker
              id="arrowhead-conditional"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="#eab308" />
            </marker>
            <marker
              id="arrowhead-error"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="#ef4444" />
            </marker>
          </defs>

          {edges.map((edge) => {
            const sourceNode = nodes.find((n) => n.id === edge.source);
            const targetNode = nodes.find((n) => n.id === edge.target);
            if (!sourceNode || !targetNode) {
              return null;
            }

            const strokeColor =
              edge.type === 'conditional'
                ? '#eab308'
                : edge.type === 'error'
                  ? '#ef4444'
                  : '#3b82f6';

            const markerId =
              edge.type === 'conditional'
                ? 'arrowhead-conditional'
                : edge.type === 'error'
                  ? 'arrowhead-error'
                  : 'arrowhead';

            // Calculate path with curved line
            const sourceX = sourceNode.position.x + 64;
            const sourceY = sourceNode.position.y + 40;
            const targetX = targetNode.position.x + 64;
            const targetY = targetNode.position.y + 40;
            const midX = (sourceX + targetX) / 2;

            return (
              <g key={edge.id}>
                <path
                  d={`M ${sourceX} ${sourceY} Q ${midX} ${sourceY}, ${midX} ${
                    (sourceY + targetY) / 2
                  } T ${targetX} ${targetY}`}
                  stroke={strokeColor}
                  strokeWidth="2"
                  fill="none"
                  markerEnd={`url(#${markerId})`}
                />
                {edge.label && (
                  <text
                    x={midX}
                    y={(sourceY + targetY) / 2}
                    fill="currentColor"
                    className="text-xs text-gray-600 dark:text-gray-400"
                    textAnchor="middle"
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Render nodes */}
        {nodes.map((node) => (
          <motion.div
            key={node.id}
            drag
            dragMomentum={false}
            onDragEnd={(e, info) => {
              onNodeMove(node.id, node.position.x + info.offset.x, node.position.y + info.offset.y);
            }}
            onClick={() => onNodeClick(node)}
            style={{
              position: 'absolute',
              left: node.position.x,
              top: node.position.y,
              zIndex: 10,
            }}
            className={`w-32 p-3 rounded-lg shadow-lg cursor-pointer transition-all ${getNodeColor(
              node.type
            )} border-2 ${
              selectedNode?.id === node.id
                ? 'ring-2 ring-blue-500 ring-offset-2'
                : 'hover:shadow-xl'
            }`}
            whileHover={{ scale: 1.05 }}
            aria-label={`${node.type} node: ${node.label}`}
          >
            <div className="flex flex-col items-center gap-2">
              <span className="text-2xl" role="img" aria-hidden="true">
                {getNodeIcon(node.type)}
              </span>
              <div className="text-sm font-medium text-gray-900 dark:text-white text-center">
                {node.label}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                {node.type}
              </div>
            </div>

            {/* Connection points */}
            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full border-2 border-white dark:border-gray-800" />
            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full border-2 border-white dark:border-gray-800" />
          </motion.div>
        ))}

        {/* Instructions overlay when no nodes */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Start Building Your Workflow
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Drag nodes from the left palette to the canvas
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
