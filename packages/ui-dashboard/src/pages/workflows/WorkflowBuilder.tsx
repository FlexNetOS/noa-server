import React, { useState, useCallback, useRef, useEffect } from 'react';

import { motion } from 'framer-motion';

import type { Workflow, WorkflowNode, WorkflowEdge } from '../../types/workflow';

interface WorkflowBuilderProps {
  workflowId?: string;
}

export function WorkflowBuilder({ workflowId }: WorkflowBuilderProps) {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragNode, setDragNode] = useState<{ type: string; label: string } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (workflowId) {
      loadWorkflow(workflowId);
    } else {
      // Initialize new workflow
      setNodes([
        {
          id: 'start',
          type: 'start',
          label: 'Start',
          position: { x: 100, y: 100 },
          data: {},
        },
      ]);
    }
  }, [workflowId]);

  const loadWorkflow = async (id: string) => {
    try {
      const response = await fetch(`/api/workflows/${id}`);
      const data = await response.json();
      setWorkflow(data);
      setNodes(data.nodes);
      setEdges(data.edges);
    } catch (error) {
      console.error('Failed to load workflow:', error);
    }
  };

  const nodeTypes = [
    { type: 'task', label: 'Task', icon: '⚙️' },
    { type: 'agent', label: 'Agent', icon: '🤖' },
    { type: 'decision', label: 'Decision', icon: '❓' },
    { type: 'parallel', label: 'Parallel', icon: '⫸' },
    { type: 'end', label: 'End', icon: '🏁' },
  ];

  const handleDragStart = (type: string, label: string) => {
    setDragNode({ type, label });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragNode || !canvasRef.current) {
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      type: dragNode.type as any,
      label: dragNode.label,
      position: { x, y },
      data: {},
    };

    setNodes([...nodes, newNode]);
    setDragNode(null);
  };

  const handleNodeClick = (node: WorkflowNode) => {
    setSelectedNode(node);
  };

  const handleNodeUpdate = (updates: Partial<WorkflowNode>) => {
    if (!selectedNode) {
      return;
    }

    setNodes(nodes.map((n) => (n.id === selectedNode.id ? { ...n, ...updates } : n)));
    setSelectedNode({ ...selectedNode, ...updates });
  };

  const handleSave = async () => {
    const workflowData: Partial<Workflow> = {
      name: workflow?.name || 'Untitled Workflow',
      description: workflow?.description || '',
      status: workflow?.status || 'draft',
      nodes,
      edges,
      version: workflow?.version || '1.0.0',
      tags: workflow?.tags || [],
    };

    try {
      const method = workflowId ? 'PUT' : 'POST';
      const url = workflowId ? `/api/workflows/${workflowId}` : '/api/workflows';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflowData),
      });

      const saved = await response.json();
      setWorkflow(saved);
      alert('Workflow saved successfully!');
    } catch (error) {
      console.error('Failed to save workflow:', error);
      alert('Failed to save workflow');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Toolbar */}
      <div className="flex-none flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <button
            onClick={() => (window.location.href = '/workflows')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Back to workflows"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </button>

          <input
            type="text"
            value={workflow?.name || 'Untitled Workflow'}
            onChange={(e) => setWorkflow((prev) => ({ ...prev!, name: e.target.value }))}
            className="text-xl font-semibold bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 text-gray-900 dark:text-white"
            aria-label="Workflow name"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Save
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Node Palette */}
        <div className="flex-none w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Nodes</h3>
            <div className="space-y-2">
              {nodeTypes.map((nodeType) => (
                <motion.div
                  key={nodeType.type}
                  draggable
                  onDragStart={() => handleDragStart(nodeType.type, nodeType.label)}
                  whileHover={{ scale: 1.02 }}
                  className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-move hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{nodeType.icon}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {nodeType.label}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative overflow-auto">
          <div
            ref={canvasRef}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="min-w-full min-h-full bg-gray-50 dark:bg-gray-900"
            style={{
              backgroundImage: `radial-gradient(circle, #cbd5e1 1px, transparent 1px)`,
              backgroundSize: '20px 20px',
            }}
          >
            {/* Render edges */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {edges.map((edge) => {
                const sourceNode = nodes.find((n) => n.id === edge.source);
                const targetNode = nodes.find((n) => n.id === edge.target);
                if (!sourceNode || !targetNode) {
                  return null;
                }

                return (
                  <line
                    key={edge.id}
                    x1={sourceNode.position.x + 50}
                    y1={sourceNode.position.y + 30}
                    x2={targetNode.position.x + 50}
                    y2={targetNode.position.y + 30}
                    stroke="#3b82f6"
                    strokeWidth="2"
                    markerEnd="url(#arrowhead)"
                  />
                );
              })}
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
              </defs>
            </svg>

            {/* Render nodes */}
            {nodes.map((node) => (
              <motion.div
                key={node.id}
                drag
                dragMomentum={false}
                onDragEnd={(e, info) => {
                  handleNodeUpdate({
                    position: {
                      x: node.position.x + info.offset.x,
                      y: node.position.y + info.offset.y,
                    },
                  });
                }}
                onClick={() => handleNodeClick(node)}
                style={{
                  position: 'absolute',
                  left: node.position.x,
                  top: node.position.y,
                }}
                className={`w-28 p-3 bg-white dark:bg-gray-800 border-2 rounded-lg shadow-lg cursor-pointer transition-colors ${
                  selectedNode?.id === node.id
                    ? 'border-blue-500'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="text-sm font-medium text-gray-900 dark:text-white text-center">
                  {node.label}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
                  {node.type}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Properties Panel */}
        {selectedNode && (
          <div className="flex-none w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Node Properties
                </h3>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  aria-label="Close properties"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Label
                  </label>
                  <input
                    type="text"
                    value={selectedNode.label}
                    onChange={(e) => handleNodeUpdate({ label: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {selectedNode.type === 'agent' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Agent Type
                    </label>
                    <select
                      value={selectedNode.data.agentType || ''}
                      onChange={(e) =>
                        handleNodeUpdate({
                          data: { ...selectedNode.data, agentType: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select agent type...</option>
                      <option value="coder">Coder</option>
                      <option value="reviewer">Reviewer</option>
                      <option value="tester">Tester</option>
                      <option value="researcher">Researcher</option>
                    </select>
                  </div>
                )}

                {selectedNode.type === 'task' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Task Description
                    </label>
                    <textarea
                      value={selectedNode.data.taskDescription || ''}
                      onChange={(e) =>
                        handleNodeUpdate({
                          data: { ...selectedNode.data, taskDescription: e.target.value },
                        })
                      }
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default WorkflowBuilder;
