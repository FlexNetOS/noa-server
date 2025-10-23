// Custom hook for telemetry data with auto-refresh
import { useEffect } from 'react';

import { api } from '@/services/api';
import { useDashboardStore } from '@/services/store';

export function useTelemetry() {
  const store = useDashboardStore();
  const { fetchTelemetry, autoRefresh, refreshInterval, updateFromWebSocket } = store;

  // Initial fetch and auto-refresh
  useEffect(() => {
    void fetchTelemetry();

    if (autoRefresh) {
      const interval = setInterval(() => {
        void fetchTelemetry();
      }, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchTelemetry, autoRefresh, refreshInterval]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    api.connectWebSocket(
      (event) => updateFromWebSocket(event),
      (error) => console.error('WebSocket error:', error)
    );

    return () => api.disconnectWebSocket();
  }, [updateFromWebSocket]);

  return store;
}
