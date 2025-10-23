'use client';

import { useState, useEffect } from 'react';

import { getSocket } from '@/lib/websocket';
import { SystemState } from '@/types';

export function useSystemMetrics() {
  const [systemState, setSystemState] = useState<SystemState>({
    version: '1.0.0',
    agents: 37,
    activeAgents: 0,
    workflows: 0,
    activeWorkflows: 0,
    systemHealth: {
      cpu: 0,
      memory: 0,
      disk: 0,
      network: 0,
    },
    services: [],
    uptime: 0,
    lastOptimization: Date.now(),
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const socket = getSocket();

    // Request initial system state
    socket.emit('system:status');

    // Listen for system updates
    socket.on('system:status', (data: SystemState) => {
      setSystemState(data);
      setLoading(false);
    });

    socket.on('system:metrics', (metrics: SystemState['systemHealth']) => {
      setSystemState((prev) => ({ ...prev, systemHealth: metrics }));
    });

    // Poll system metrics every 5 seconds
    const interval = setInterval(() => {
      socket.emit('system:status');
    }, 5000);

    return () => {
      socket.off('system:status');
      socket.off('system:metrics');
      clearInterval(interval);
    };
  }, []);

  return { systemState, loading };
}
