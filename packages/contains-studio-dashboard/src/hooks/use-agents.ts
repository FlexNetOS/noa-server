'use client';

import { useState, useEffect } from 'react';

import { getSocket } from '@/lib/websocket';
import { Agent } from '@/types';

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const socket = getSocket();

    // Request initial agent list
    socket.emit('agents:list');

    // Listen for agent updates
    socket.on('agents:list', (data: Agent[]) => {
      setAgents(data);
      setLoading(false);
    });

    socket.on('agent:status', (data: { agentId: string; status: Agent['status'] }) => {
      setAgents((prev) =>
        prev.map((agent) => (agent.id === data.agentId ? { ...agent, status: data.status } : agent))
      );
    });

    socket.on('agent:task-complete', (data: { agentId: string }) => {
      setAgents((prev) =>
        prev.map((agent) =>
          agent.id === data.agentId
            ? { ...agent, tasksCompleted: agent.tasksCompleted + 1, currentTask: undefined }
            : agent
        )
      );
    });

    return () => {
      socket.off('agents:list');
      socket.off('agent:status');
      socket.off('agent:task-complete');
    };
  }, []);

  return { agents, loading };
}
