'use client';

import { useState, useEffect } from 'react';

import { getSocket } from '@/lib/websocket';
import { Workflow } from '@/types';

export function useWorkflows() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const socket = getSocket();

    // Request initial workflow list
    socket.emit('workflows:list');

    // Listen for workflow updates
    socket.on('workflows:list', (data: Workflow[]) => {
      setWorkflows(data);
      setLoading(false);
    });

    socket.on('workflow:created', (workflow: Workflow) => {
      setWorkflows((prev) => [workflow, ...prev]);
    });

    socket.on(
      'workflow:progress',
      (data: { workflowId: string; phase: string; progress: number }) => {
        setWorkflows((prev) =>
          prev.map((workflow) =>
            workflow.id === data.workflowId ? { ...workflow, currentPhase: data.phase } : workflow
          )
        );
      }
    );

    socket.on('workflow:complete', (data: { workflowId: string }) => {
      setWorkflows((prev) =>
        prev.map((workflow) =>
          workflow.id === data.workflowId
            ? { ...workflow, status: 'completed', completedAt: new Date() }
            : workflow
        )
      );
    });

    return () => {
      socket.off('workflows:list');
      socket.off('workflow:created');
      socket.off('workflow:progress');
      socket.off('workflow:complete');
    };
  }, []);

  return { workflows, loading };
}
