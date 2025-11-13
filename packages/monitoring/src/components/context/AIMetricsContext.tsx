/**
 * AI Metrics Context Provider
 * Provides shared state and WebSocket connection for real-time metrics
 */

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  AIMetrics,
  ProviderMetrics,
  ModelPerformance,
  CostMetrics,
  JobQueueMetrics,
  Alert,
  DashboardConfig,
  WebSocketMessage
} from '../types';

interface AIMetricsContextValue {
  metrics: AIMetrics[];
  providerMetrics: ProviderMetrics[];
  modelPerformance: ModelPerformance[];
  costMetrics: CostMetrics | null;
  queueMetrics: JobQueueMetrics | null;
  alerts: Alert[];
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  config: DashboardConfig;
  refreshData: () => Promise<void>;
  acknowledgeAlert: (alertId: string) => void;
}

const defaultConfig: DashboardConfig = {
  refreshInterval: 30000,
  websocketUrl: process.env.REACT_APP_WS_URL || 'ws://localhost:3000',
  apiBaseUrl: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
  darkMode: false,
  enableWebSocket: true,
  maxDataPoints: 100
};

const AIMetricsContext = createContext<AIMetricsContextValue | undefined>(undefined);

export const useAIMetrics = () => {
  const context = useContext(AIMetricsContext);
  if (!context) {
    throw new Error('useAIMetrics must be used within AIMetricsProvider');
  }
  return context;
};

interface AIMetricsProviderProps {
  children: ReactNode;
  config?: Partial<DashboardConfig>;
}

export const AIMetricsProvider: React.FC<AIMetricsProviderProps> = ({ children, config: userConfig }) => {
  const config = { ...defaultConfig, ...userConfig };

  const [metrics, setMetrics] = useState<AIMetrics[]>([]);
  const [providerMetrics, setProviderMetrics] = useState<ProviderMetrics[]>([]);
  const [modelPerformance, setModelPerformance] = useState<ModelPerformance[]>([]);
  const [costMetrics, setCostMetrics] = useState<CostMetrics | null>(null);
  const [queueMetrics, setQueueMetrics] = useState<JobQueueMetrics | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Fetch data from API
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [
        metricsRes,
        providersRes,
        modelsRes,
        costRes,
        queueRes,
        alertsRes
      ] = await Promise.all([
        fetch(`${config.apiBaseUrl}/metrics/ai`),
        fetch(`${config.apiBaseUrl}/metrics/providers`),
        fetch(`${config.apiBaseUrl}/metrics/models`),
        fetch(`${config.apiBaseUrl}/metrics/costs`),
        fetch(`${config.apiBaseUrl}/metrics/queue`),
        fetch(`${config.apiBaseUrl}/alerts`)
      ]);

      if (!metricsRes.ok || !providersRes.ok) {
        throw new Error('Failed to fetch metrics data');
      }

      const [metricsData, providersData, modelsData, costData, queueData, alertsData] = await Promise.all([
        metricsRes.json(),
        providersRes.json(),
        modelsRes.json(),
        costRes.json(),
        queueRes.json(),
        alertsRes.json()
      ]);

      setMetrics(metricsData.slice(-config.maxDataPoints));
      setProviderMetrics(providersData);
      setModelPerformance(modelsData);
      setCostMetrics(costData);
      setQueueMetrics(queueData);
      setAlerts(alertsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Failed to fetch metrics:', err);
    } finally {
      setIsLoading(false);
    }
  }, [config.apiBaseUrl, config.maxDataPoints]);

  // WebSocket connection
  useEffect(() => {
    if (!config.enableWebSocket) {
      return;
    }

    const newSocket = io(config.websocketUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setError(null);
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    newSocket.on('error', (err) => {
      console.error('WebSocket error:', err);
      setError('WebSocket connection error');
    });

    newSocket.on('metrics:update', (message: WebSocketMessage) => {
      handleWebSocketMessage(message);
    });

    newSocket.on('alert:new', (alert: Alert) => {
      setAlerts((prev) => [alert, ...prev].slice(0, 50));
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [config.websocketUrl, config.enableWebSocket]);

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'metrics':
        setMetrics((prev) => [...prev, message.data].slice(-config.maxDataPoints));
        break;
      case 'health':
        setProviderMetrics(message.data);
        break;
      case 'alert':
        setAlerts((prev) => [message.data, ...prev].slice(0, 50));
        break;
      default:
        break;
    }
  }, [config.maxDataPoints]);

  // Auto-refresh polling
  useEffect(() => {
    fetchData();

    if (!config.enableWebSocket) {
      const interval = setInterval(fetchData, config.refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, config.refreshInterval, config.enableWebSocket]);

  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      )
    );

    fetch(`${config.apiBaseUrl}/alerts/${alertId}/acknowledge`, {
      method: 'POST'
    }).catch(console.error);
  }, [config.apiBaseUrl]);

  const value: AIMetricsContextValue = {
    metrics,
    providerMetrics,
    modelPerformance,
    costMetrics,
    queueMetrics,
    alerts,
    isConnected,
    isLoading,
    error,
    config,
    refreshData: fetchData,
    acknowledgeAlert
  };

  return (
    <AIMetricsContext.Provider value={value}>
      {children}
    </AIMetricsContext.Provider>
  );
};
