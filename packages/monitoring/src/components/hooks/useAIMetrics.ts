/**
 * Custom Hook for AI Metrics Fetching
 * Provides data fetching and real-time updates for AI metrics
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AIMetrics,
  ProviderMetrics,
  ModelPerformance,
  CostMetrics,
  JobQueueMetrics
} from '../types';

interface UseAIMetricsOptions {
  apiBaseUrl: string;
  refreshInterval?: number;
  enabled?: boolean;
}

interface UseAIMetricsReturn {
  metrics: AIMetrics[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export const useAIMetrics = (options: UseAIMetricsOptions): UseAIMetricsReturn => {
  const { apiBaseUrl, refreshInterval = 30000, enabled = true } = options;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ai-metrics'],
    queryFn: async () => {
      const response = await fetch(`${apiBaseUrl}/metrics/ai`);
      if (!response.ok) {
        throw new Error('Failed to fetch AI metrics');
      }
      return response.json() as Promise<AIMetrics[]>;
    },
    refetchInterval: refreshInterval,
    enabled
  });

  return {
    metrics: data || [],
    isLoading,
    error: error as Error | null,
    refetch
  };
};

export const useProviderMetrics = (options: UseAIMetricsOptions) => {
  const { apiBaseUrl, refreshInterval = 30000, enabled = true } = options;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['provider-metrics'],
    queryFn: async () => {
      const response = await fetch(`${apiBaseUrl}/metrics/providers`);
      if (!response.ok) {
        throw new Error('Failed to fetch provider metrics');
      }
      return response.json() as Promise<ProviderMetrics[]>;
    },
    refetchInterval: refreshInterval,
    enabled
  });

  return {
    providers: data || [],
    isLoading,
    error: error as Error | null,
    refetch
  };
};

export const useModelPerformance = (options: UseAIMetricsOptions) => {
  const { apiBaseUrl, refreshInterval = 30000, enabled = true } = options;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['model-performance'],
    queryFn: async () => {
      const response = await fetch(`${apiBaseUrl}/metrics/models`);
      if (!response.ok) {
        throw new Error('Failed to fetch model performance');
      }
      return response.json() as Promise<ModelPerformance[]>;
    },
    refetchInterval: refreshInterval,
    enabled
  });

  return {
    models: data || [],
    isLoading,
    error: error as Error | null,
    refetch
  };
};

export const useCostMetrics = (options: UseAIMetricsOptions) => {
  const { apiBaseUrl, refreshInterval = 30000, enabled = true } = options;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['cost-metrics'],
    queryFn: async () => {
      const response = await fetch(`${apiBaseUrl}/metrics/costs`);
      if (!response.ok) {
        throw new Error('Failed to fetch cost metrics');
      }
      return response.json() as Promise<CostMetrics>;
    },
    refetchInterval: refreshInterval,
    enabled
  });

  return {
    costs: data || null,
    isLoading,
    error: error as Error | null,
    refetch
  };
};

export const useQueueMetrics = (options: UseAIMetricsOptions) => {
  const { apiBaseUrl, refreshInterval = 10000, enabled = true } = options;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['queue-metrics'],
    queryFn: async () => {
      const response = await fetch(`${apiBaseUrl}/metrics/queue`);
      if (!response.ok) {
        throw new Error('Failed to fetch queue metrics');
      }
      return response.json() as Promise<JobQueueMetrics>;
    },
    refetchInterval: refreshInterval,
    enabled
  });

  return {
    queue: data || null,
    isLoading,
    error: error as Error | null,
    refetch
  };
};

/**
 * WebSocket hook for real-time updates
 */
export const useWebSocketMetrics = (websocketUrl: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const ws = new WebSocket(websocketUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        setLastMessage(message);

        // Invalidate relevant queries on message
        if (message.type === 'metrics') {
          queryClient.invalidateQueries({ queryKey: ['ai-metrics'] });
        } else if (message.type === 'health') {
          queryClient.invalidateQueries({ queryKey: ['provider-metrics'] });
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    return () => {
      ws.close();
    };
  }, [websocketUrl, queryClient]);

  return {
    isConnected,
    lastMessage
  };
};
