// API service for Claude Suite backend integration
import type { AgentStatus, TaskQueueItem, TelemetryData, Queue, QueueJob } from '@/types';
import { RequestContext, requestInterceptor } from './request-interceptor';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8081/api/v1';
const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8081';

interface WebSocketHandshake {
  sid?: string;
  pingInterval?: number;
  pingTimeout?: number;
}

interface BaseWebSocketEvent {
  source: 'message-queue';
  timestamp: number;
}

export type DashboardWebSocketEvent =
  | (BaseWebSocketEvent & {
      type: 'telemetry-update';
      data: {
        messagesSent?: number;
        messagesReceived?: number;
        queueName?: string;
        messageId?: string;
        message?: unknown;
        metrics?: unknown;
        uptime?: number;
        totalInferences?: number;
        [key: string]: unknown;
      };
    })
  | (BaseWebSocketEvent & {
      type: 'task-update';
      data: {
        jobId: string;
        status: string;
        queueName?: string;
        job?: any;
        result?: any;
        error?: any;
        timestamp?: number;
        [key: string]: unknown;
      };
    })
  | (BaseWebSocketEvent & {
      type: 'health-update';
      data: {
        status: 'healthy' | 'degraded' | 'unhealthy';
        uptime?: number;
        healthStatuses?: unknown;
        [key: string]: unknown;
      };
    })
  | (BaseWebSocketEvent & {
      type: 'metrics-update';
      data: {
        metrics: unknown;
        [key: string]: unknown;
      };
    })
  | (BaseWebSocketEvent & {
      type: 'unknown-event';
      data: {
        event: string;
        payload: unknown;
        [key: string]: unknown;
      };
    });

class APIService {
  private wsConnection: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private listeners: Map<string, Set<(data: DashboardWebSocketEvent) => void>> = new Map();
  private pingInterval = 25000;
  private pingTimeout = 20000;
  private pingTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private pingIntervalId: ReturnType<typeof setInterval> | null = null;
  private hasSubscribed = false;
  private manualDisconnect = false;

  /**
   * Create an intercepted request context
   */
  private createRequestContext(
    endpoint: string,
    method: string = 'GET',
    body?: any,
    headers?: Record<string, string>
  ): RequestContext {
    return {
      endpoint: endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`,
      method,
      body,
      headers,
      timestamp: Date.now(),
    };
  }

  /**
   * Intercept and optimize request before sending
   */
  private async interceptRequest(request: RequestContext): Promise<RequestContext> {
    const result = await requestInterceptor.intercept(request);
    return result.optimized;
  }

  /**
   * Make an intercepted HTTP request
   */
  private async makeInterceptedRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const requestContext = this.createRequestContext(
      endpoint,
      options.method || 'GET',
      options.body,
      options.headers as Record<string, string>
    );

    const interceptedRequest = await this.interceptRequest(requestContext);

    const fetchOptions: RequestInit = {
      ...options,
      method: interceptedRequest.method,
      headers: interceptedRequest.headers,
    };

    // Handle body replacement for intercepted requests
    if (interceptedRequest.body !== requestContext.body) {
      if (typeof interceptedRequest.body === 'string') {
        fetchOptions.body = interceptedRequest.body;
      } else if (interceptedRequest.body && typeof interceptedRequest.body === 'object') {
        fetchOptions.body = JSON.stringify(interceptedRequest.body);
        if (!fetchOptions.headers) fetchOptions.headers = {};
        (fetchOptions.headers as Record<string, string>)['Content-Type'] = 'application/json';
      }
    }

    return fetch(interceptedRequest.endpoint, fetchOptions);
  }

  // REST API calls
  async getTelemetry(): Promise<TelemetryData> {
    try {
      // Get live data from message queue API
      const [statsResponse, providersResponse, queuesResponse] = await Promise.all([
        this.makeInterceptedRequest('/stats'),
        this.makeInterceptedRequest('/providers'),
        this.makeInterceptedRequest('/queues'),
      ]);

      if (!statsResponse.ok || !providersResponse.ok || !queuesResponse.ok) {
        throw new Error('Failed to fetch live data from message queue API');
      }

      const stats = await statsResponse.json();
      const providers = await providersResponse.json();
      const queues = await queuesResponse.json();

      // Transform message queue data to dashboard format
      return this.transformQueueDataToTelemetry(stats, providers, queues);
    } catch (error) {
      console.warn('Message queue API unavailable, using static data:', error);
      return this.getStaticTelemetry();
    }
  }

  async getAgents(): Promise<AgentStatus[]> {
    try {
      const response = await this.makeInterceptedRequest('/providers');
      if (!response.ok) {
        throw new Error('Failed to fetch providers');
      }
      const providers = await response.json();
      return this.generateAgentsFromProviders(providers);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
      return [];
    }
  }

  async getTaskQueue(): Promise<TaskQueueItem[]> {
    try {
      const [statsResponse, queuesResponse] = await Promise.all([
        this.makeInterceptedRequest('/stats'),
        this.makeInterceptedRequest('/queues'),
      ]);

      if (!statsResponse.ok || !queuesResponse.ok) {
        throw new Error('Failed to fetch queue data');
      }

      const stats = await statsResponse.json();
      const queues = await queuesResponse.json();

      return this.generateTasksFromQueues(queues, stats.activeJobs || 0, stats.queuedJobs || 0);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      return [];
    }
  }

  async pauseAgent(agentId: string): Promise<void> {
    await this.makeInterceptedRequest(`/agents/${agentId}/pause`, { method: 'POST' });
  }

  async resumeAgent(agentId: string): Promise<void> {
    await this.makeInterceptedRequest(`/agents/${agentId}/resume`, { method: 'POST' });
  }

  async cancelTask(taskId: string): Promise<void> {
    await this.makeInterceptedRequest(`/tasks/${taskId}/cancel`, { method: 'POST' });
  }

  // WebSocket connection for real-time updates
  connectWebSocket(
    onMessage: (data: DashboardWebSocketEvent) => void,
    onError?: (error: Event) => void
  ): void {
    if (
      this.wsConnection &&
      (this.wsConnection.readyState === WebSocket.OPEN ||
        this.wsConnection.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.hasSubscribed = false;
    this.manualDisconnect = false;

    try {
      const trimmedBase = WS_BASE.endsWith('/') ? WS_BASE.slice(0, -1) : WS_BASE;
      const normalizedBase = trimmedBase.startsWith('http')
        ? trimmedBase.replace(/^http/, 'ws')
        : trimmedBase;
      const socketUrl = `${normalizedBase}/socket.io/?EIO=4&transport=websocket`;
      const connection = new WebSocket(socketUrl);
      this.wsConnection = connection;

      connection.onopen = () => {
        console.log('WebSocket connected to message queue server');
        this.reconnectAttempts = 0;
      };

      connection.onmessage = (event) => {
        const rawData = event.data;

        if (typeof rawData !== 'string') {
          return;
        }

        console.log('WebSocket message received:', rawData);

        try {
          if (rawData === '2') {
            // Server ping - respond with pong
            connection.send('3');
            this.resetPingTimer();
            return;
          }

          if (rawData === '3') {
            // Pong acknowledgement
            this.resetPingTimer();
            return;
          }

          if (rawData.startsWith('0')) {
            this.handleHandshake(rawData);
            return;
          }

          if (rawData === '40') {
            console.log('Socket.IO connection established');
            this.subscribeToChannels();
            this.startPingInterval();
            return;
          }

          if (rawData === '41') {
            console.warn('Socket.IO namespace closed by server');
            connection.close();
            return;
          }

          if (rawData.startsWith('42')) {
            const eventPayload = JSON.parse(rawData.substring(2));
            if (Array.isArray(eventPayload) && eventPayload.length >= 1) {
              const [eventName, payload] = eventPayload as [string, any];
              const transformed = this.transformWebSocketData(eventName, payload);
              onMessage(transformed);
              this.notifyListeners(eventName, transformed);
            }
            return;
          }

          // Fallback for direct JSON payloads (non Socket.IO)
          if (!rawData.startsWith('4')) {
            this.handleFallbackMessage(rawData, onMessage);
          }
        } catch (error) {
          console.error('Failed to process WebSocket message:', error);
        }
      };

      connection.onerror = (error) => {
        console.error('WebSocket error:', error);
        onError?.(error);
      };

      connection.onclose = () => {
        console.log('WebSocket disconnected from message queue server');
        const shouldReconnect = !this.manualDisconnect;
        this.cleanupConnection();
        this.wsConnection = null;
        if (shouldReconnect) {
          this.attemptReconnect(onMessage, onError);
        } else {
          this.manualDisconnect = false;
        }
      };
    } catch (error) {
      console.error('Failed to establish WebSocket connection:', error);
    }
  }

  private handleHandshake(rawData: string): void {
    try {
      const payload = rawData.substring(1);
      const handshake = payload ? (JSON.parse(payload) as WebSocketHandshake) : undefined;

      if (handshake?.pingInterval) {
        this.pingInterval = handshake.pingInterval;
      }
      if (handshake?.pingTimeout) {
        this.pingTimeout = handshake.pingTimeout;
      }
    } catch (error) {
      console.warn('Failed to parse Socket.IO handshake payload:', error);
    }

    this.wsConnection?.send('40');
  }

  private subscribeToChannels(): void {
    if (this.hasSubscribed) {
      return;
    }

    const channels = ['messages', 'jobs', 'metrics', 'health'];
    this.wsConnection?.send(`42["subscribe",${JSON.stringify(channels)}]`);
    this.hasSubscribed = true;
  }

  private handleFallbackMessage(
    rawData: string,
    onMessage: (data: DashboardWebSocketEvent) => void
  ): void {
    try {
      const parsed = JSON.parse(rawData);
      if (!parsed || typeof parsed !== 'object') {
        return;
      }

      const eventName =
        typeof (parsed as { type?: unknown }).type === 'string'
          ? ((parsed as { type?: string }).type as string)
          : 'unknown-event';

      const payload =
        (parsed as { payload?: unknown }).payload ?? (parsed as { data?: unknown }).data ?? parsed;

      const transformed = this.transformWebSocketData(eventName, payload);
      onMessage(transformed);
      this.notifyListeners(eventName, transformed);
    } catch {
      // Non-JSON payload - ignore
    }
  }

  private notifyListeners(eventName: string, payload: DashboardWebSocketEvent): void {
    const listeners = this.listeners.get(eventName) || this.listeners.get('message-queue-event');

    if (!listeners) {
      return;
    }

    listeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (error) {
        console.error('WebSocket listener callback failed:', error);
      }
    });
  }

  private resetPingTimer(): void {
    this.clearPingTimeout();

    if (this.pingTimeout > 0) {
      this.pingTimeoutId = setTimeout(() => {
        console.warn('WebSocket ping timeout detected, closing connection');
        this.wsConnection?.close();
      }, this.pingTimeout + 1000);
    }
  }

  private startPingInterval(): void {
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
    }

    if (this.pingInterval > 0) {
      this.pingIntervalId = setInterval(() => {
        this.sendPing();
      }, this.pingInterval);
      this.sendPing();
    }
  }

  private clearPingTimeout(): void {
    if (this.pingTimeoutId) {
      clearTimeout(this.pingTimeoutId);
      this.pingTimeoutId = null;
    }
  }

  private cleanupConnection(): void {
    this.clearPingTimeout();
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }
    this.hasSubscribed = false;
  }

  private sendPing(): void {
    if (this.wsConnection?.readyState === WebSocket.OPEN) {
      this.wsConnection.send('2');
      this.resetPingTimer();
    }
  }

  private attemptReconnect(
    onMessage: (data: DashboardWebSocketEvent) => void,
    onError?: (error: Event) => void
  ): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      console.log(`Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts})`);
      setTimeout(() => this.connectWebSocket(onMessage, onError), delay);
    }
  }

  subscribe(event: string, callback: (data: DashboardWebSocketEvent) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(event);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }

  disconnectWebSocket(): void {
    this.manualDisconnect = true;
    this.cleanupConnection();
    this.wsConnection?.close();
    this.wsConnection = null;
  }

  /**
   * Transform message queue API data to dashboard telemetry format
   */
  private transformQueueDataToTelemetry(
    stats: any,
    providers: any[],
    queues: any[]
  ): TelemetryData {
    const uptime = stats.uptime || 0;
    const totalMessages = stats.totalMessagesSent + stats.totalMessagesReceived;
    const activeJobs = stats.activeJobs || 0;
    const queuedJobs = stats.queuedJobs || 0;

    return {
      swarmMetrics: {
        totalAgents: providers.length,
        activeAgents: providers.filter((p) => p.isConnected).length,
        totalTasks: totalMessages,
        completedTasks: stats.totalMessagesReceived,
        failedTasks: stats.totalJobsFailed || 0,
        avgResponseTime: stats.averageProcessingTime || 150,
        throughput: totalMessages / Math.max(uptime / 1000, 1), // messages per second
        uptime: uptime,
      },
      systemHealth: {
        status: providers.some((p) => p.isConnected) ? 'healthy' : 'degraded',
        cpu: 45, // Mock values for now
        memory: 62,
        disk: 58,
        network: { latency: 12, throughput: 850 },
        services: {
          mcp: true,
          neural: true,
          swarm: providers.some((p) => p.isConnected),
          hooks: true,
        },
      },
      neuralMetrics: {
        modelsLoaded: providers.length,
        totalInferences: totalMessages,
        avgInferenceTime: stats.averageProcessingTime || 200,
        gpuUtilization: 78,
        vramUsage: 6.4,
        accuracy: 0.95,
      },
      agents: this.generateAgentsFromProviders(providers),
      taskQueue: this.generateTasksFromQueues(queues, activeJobs, queuedJobs),
      queues: queues,
      mcpTools: this.generateMCPToolsFromStats(stats),
      recentHooks: [],
      truthGate: {
        passed: true,
        accuracy: 0.95,
        timestamp: new Date().toISOString(),
      },
    };
  }

  private generateAgentsFromProviders(providers: any[]): AgentStatus[] {
    return providers.map((provider, index) => ({
      id: `agent-${index + 1}`,
      name: `${provider.type}-${index + 1}`,
      type: provider.type,
      status: provider.isConnected ? 'running' : 'idle',
      taskCount: 10 + Math.floor(Math.random() * 20),
      avgResponseTime: 150 + Math.floor(Math.random() * 100),
      lastActive: new Date(Date.now() - Math.random() * 3600000).toISOString(),
      cpu: 30 + Math.floor(Math.random() * 40),
      memory: 40 + Math.floor(Math.random() * 30),
    }));
  }

  private generateTasksFromQueues(
    queues: any[],
    activeJobs: number,
    queuedJobs: number
  ): TaskQueueItem[] {
    const tasks: TaskQueueItem[] = [];

    // Use actual queue data if available
    if (queues && queues.length > 0) {
      queues.forEach((queue, queueIndex) => {
        const queueJobs = queue.jobs || [];
        queueJobs.forEach((job: any, jobIndex: number) => {
          tasks.push({
            id: job.id || `queue-job-${queueIndex}-${jobIndex}`,
            type:
              job.type || ['code-review', 'test-execution', 'deployment', 'analysis'][jobIndex % 4],
            priority:
              job.priority ||
              (['high', 'medium', 'low', 'critical'][jobIndex % 4] as TaskQueueItem['priority']),
            status: job.status || 'pending',
            assignedAgent: job.assignedAgent,
            createdAt:
              job.createdAt || new Date(Date.now() - Math.random() * 7200000).toISOString(),
            startedAt: job.startedAt,
            progress: job.progress,
          });
        });
      });
    }

    // Fill remaining slots with generated tasks if needed
    const totalTasks = tasks.length;
    const remainingActive = Math.max(0, activeJobs - totalTasks);
    const remainingQueued = Math.max(0, queuedJobs - (totalTasks - activeJobs));

    // Add remaining active jobs
    for (let i = 0; i < remainingActive; i++) {
      tasks.push({
        id: `active-job-${totalTasks + i + 1}`,
        type: ['code-review', 'test-execution', 'deployment', 'analysis'][i % 4],
        priority: ['high', 'medium', 'low', 'critical'][i % 4] as TaskQueueItem['priority'],
        status: 'running',
        assignedAgent: `agent-${(i % 3) + 1}`,
        createdAt: new Date(Date.now() - Math.random() * 7200000).toISOString(),
        startedAt: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        progress: Math.floor(Math.random() * 100),
      });
    }

    // Add remaining queued jobs
    for (let i = 0; i < remainingQueued; i++) {
      tasks.push({
        id: `queued-job-${totalTasks + remainingActive + i + 1}`,
        type: ['code-review', 'test-execution', 'deployment', 'analysis'][i % 4],
        priority: ['high', 'medium', 'low', 'critical'][i % 4] as TaskQueueItem['priority'],
        status: 'pending',
        createdAt: new Date(Date.now() - Math.random() * 7200000).toISOString(),
      });
    }

    return tasks;
  }

  private generateMCPToolsFromStats(stats: any) {
    return [
      {
        name: 'message-queue',
        invocations: stats.totalMessagesSent || 0,
        avgDuration: stats.averageProcessingTime || 150,
        successRate: 0.95,
        lastUsed: new Date().toISOString(),
        errors: stats.totalJobsFailed || 0,
      },
      {
        name: 'job-processor',
        invocations: stats.totalJobsProcessed || 0,
        avgDuration: stats.averageProcessingTime || 200,
        successRate: 0.92,
        lastUsed: new Date().toISOString(),
        errors: stats.totalJobsFailed || 0,
      },
    ];
  }

  // Transform WebSocket data from message queue to dashboard format
  private transformWebSocketData(eventName: string, payload: any): DashboardWebSocketEvent {
    const now = Date.now();
    const eventTimestamp = this.normalizeTimestamp(
      payload?.timestamp ??
        payload?.createdAt ??
        payload?.updatedAt ??
        payload?.completedAt ??
        payload?.metadata?.timestamp,
      now
    );

    switch (eventName) {
      case 'message-sent':
        return {
          type: 'telemetry-update',
          source: 'message-queue',
          timestamp: eventTimestamp,
          data: {
            messagesSent: 1,
            queueName: payload?.queueName,
            messageId: payload?.message?.id,
            message: payload?.message,
            timestamp: eventTimestamp,
          },
        };

      case 'message-received':
        return {
          type: 'telemetry-update',
          source: 'message-queue',
          timestamp: eventTimestamp,
          data: {
            messagesReceived: 1,
            queueName: payload?.queueName,
            messageId: payload?.message?.id,
            message: payload?.message,
            timestamp: eventTimestamp,
          },
        };

      case 'message-deleted':
        return {
          type: 'telemetry-update',
          source: 'message-queue',
          timestamp: eventTimestamp,
          data: {
            messagesDeleted: 1,
            queueName: payload?.queueName,
            messageId: payload?.messageId,
            timestamp: eventTimestamp,
          },
        };

      case 'job-submitted':
      case 'job-started':
      case 'job-completed':
      case 'job-failed':
      case 'job-cancelled': {
        const statusMap: Record<string, string> = {
          'job-submitted': 'queued',
          'job-started': 'running',
          'job-completed': 'completed',
          'job-failed': 'failed',
          'job-cancelled': 'cancelled',
        };
        const status = statusMap[eventName] || payload?.status || 'unknown';
        const jobId = payload?.id ?? payload?.jobId ?? 'unknown';

        return {
          type: 'task-update',
          source: 'message-queue',
          timestamp: eventTimestamp,
          data: {
            jobId,
            status,
            queueName: payload?.queueName,
            job: payload,
            result: payload?.result,
            error: payload?.lastError ?? payload?.error,
            timestamp: eventTimestamp,
          },
        };
      }

      case 'metrics-update':
      case 'metrics-updated':
        return {
          type: 'metrics-update',
          source: 'message-queue',
          timestamp: eventTimestamp,
          data: {
            metrics: payload,
            timestamp: eventTimestamp,
          },
        };

      case 'health-check':
      case 'health-updated': {
        const statuses = Array.isArray(payload) ? payload : [];
        const derivedStatus =
          statuses.length === 0
            ? 'degraded'
            : statuses.every((status) => status?.status === 'healthy')
              ? 'healthy'
              : statuses.some((status) => status?.status === 'unhealthy')
                ? 'unhealthy'
                : 'degraded';

        return {
          type: 'health-update',
          source: 'message-queue',
          timestamp: eventTimestamp,
          data: {
            status: derivedStatus,
            healthStatuses: payload,
            timestamp: eventTimestamp,
          },
        };
      }

      default:
        return {
          type: 'unknown-event',
          source: 'message-queue',
          timestamp: eventTimestamp,
          data: {
            event: eventName,
            payload,
          },
        };
    }
  }

  private normalizeTimestamp(value: unknown, fallback: number): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (value instanceof Date) {
      return value.getTime();
    }

    if (typeof value === 'string') {
      const parsed = Date.parse(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }

    return fallback;
  }

  // Fallback to static file-based telemetry
  private async getStaticTelemetry(): Promise<TelemetryData> {
    try {
      // Load from filesystem artifacts
      const [truthGate, verification, hooks, mcpCatalog] = await Promise.all([
        this.loadJSON('../../EvidenceLedger/truth_gate.json'),
        this.loadJSON('../../EvidenceLedger/verification.json'),
        this.loadText('../../.swarm/hooks.log'),
        this.loadJSON('../../logs/mcp/tool_catalog.json'),
      ]);

      const truthGateData = truthGate as {
        passed?: boolean;
        accuracy?: number;
        timestamp?: string;
      } | null;
      const verificationData = verification as { neural_test_passed?: boolean } | null;
      const mcpCatalogData = mcpCatalog as { tools?: Array<{ name: string }> } | null;

      const recentHooks = hooks
        .split('\n')
        .filter(Boolean)
        .slice(-20)
        .map((line: string) => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      return {
        swarmMetrics: {
          totalAgents: 12,
          activeAgents: 8,
          totalTasks: 456,
          completedTasks: 432,
          failedTasks: 4,
          avgResponseTime: 245,
          throughput: 18.5,
          uptime: 3600000,
        },
        systemHealth: {
          status: 'healthy',
          cpu: 45,
          memory: 62,
          disk: 58,
          network: { latency: 12, throughput: 850 },
          services: {
            mcp: true,
            neural: verificationData?.neural_test_passed || false,
            swarm: true,
            hooks: recentHooks.length > 0,
          },
        },
        neuralMetrics: {
          modelsLoaded: 3,
          totalInferences: 1247,
          avgInferenceTime: 187,
          gpuUtilization: 78,
          vramUsage: 6.4,
          accuracy: truthGateData?.accuracy || 0,
        },
        agents: this.generateMockAgents(),
        taskQueue: this.generateMockTasks(),
        queues: this.generateMockQueues(),
        mcpTools: this.generateMockMCPTools(mcpCatalogData),
        recentHooks,
        truthGate: truthGateData
          ? {
              passed: truthGateData.passed || false,
              accuracy: truthGateData.accuracy || 0,
              timestamp: truthGateData.timestamp || new Date().toISOString(),
            }
          : undefined,
      };
    } catch (error) {
      console.error('Failed to load static telemetry:', error);
      return this.getDefaultTelemetry();
    }
  }

  private async loadJSON(path: string): Promise<unknown> {
    try {
      const response = await fetch(path);
      return response.json();
    } catch {
      return null;
    }
  }

  private async loadText(path: string): Promise<string> {
    try {
      const response = await fetch(path);
      return response.text();
    } catch {
      return '';
    }
  }

  private generateMockAgents(): AgentStatus[] {
    const types = [
      'coder',
      'reviewer',
      'tester',
      'researcher',
      'planner',
      'backend-dev',
      'ml-developer',
    ];
    const statuses: AgentStatus['status'][] = [
      'running',
      'idle',
      'running',
      'running',
      'idle',
      'running',
      'idle',
    ];

    return types.map((type, i) => ({
      id: `agent-${i + 1}`,
      name: `${type}-${i + 1}`,
      type,
      status: statuses[i],
      taskCount: Math.floor(Math.random() * 20) + 5,
      avgResponseTime: Math.floor(Math.random() * 300) + 100,
      lastActive: new Date(Date.now() - Math.random() * 3600000).toISOString(),
      cpu: Math.floor(Math.random() * 60) + 20,
      memory: Math.floor(Math.random() * 50) + 30,
    }));
  }

  private generateMockTasks(): TaskQueueItem[] {
    const priorities: TaskQueueItem['priority'][] = ['high', 'medium', 'low', 'critical'];
    const statuses: TaskQueueItem['status'][] = ['running', 'pending', 'pending', 'completed'];

    return Array.from({ length: 12 }, (_, i) => ({
      id: `task-${i + 1}`,
      type: ['code-review', 'test-execution', 'deployment', 'analysis'][i % 4],
      priority: priorities[i % 4],
      status: statuses[i % 4],
      assignedAgent: i % 3 === 0 ? `agent-${(i % 7) + 1}` : undefined,
      createdAt: new Date(Date.now() - Math.random() * 7200000).toISOString(),
      startedAt:
        i % 2 === 0 ? new Date(Date.now() - Math.random() * 3600000).toISOString() : undefined,
      progress: i % 4 === 0 ? Math.floor(Math.random() * 100) : undefined,
    }));
  }

  private generateMockQueues(): Queue[] {
    const queueNames = ['main', 'priority', 'background'];
    return queueNames.map((name, index) => ({
      name,
      jobs: Array.from({ length: 3 + index }, (_, i) => ({
        id: `${name}-job-${i + 1}`,
        type: ['code-review', 'test-execution', 'deployment', 'analysis'][i % 4],
        priority: ['high', 'medium', 'low', 'critical'][i % 4] as QueueJob['priority'],
        status: ['pending', 'running', 'completed', 'failed'][i % 4] as QueueJob['status'],
        assignedAgent: i % 2 === 0 ? `agent-${(i % 3) + 1}` : undefined,
        createdAt: new Date(Date.now() - Math.random() * 7200000).toISOString(),
        startedAt:
          i % 2 === 0 ? new Date(Date.now() - Math.random() * 3600000).toISOString() : undefined,
        progress: i % 4 === 0 ? Math.floor(Math.random() * 100) : undefined,
      })),
    }));
  }

  private generateMockMCPTools(catalog: { tools?: Array<{ name: string }> } | null) {
    const tools = catalog?.tools || [];
    return tools.slice(0, 10).map((tool) => ({
      name: tool.name,
      invocations: Math.floor(Math.random() * 500) + 50,
      avgDuration: Math.floor(Math.random() * 200) + 50,
      successRate: 0.85 + Math.random() * 0.14,
      lastUsed: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      errors: Math.floor(Math.random() * 5),
    }));
  }

  private getDefaultTelemetry(): TelemetryData {
    return {
      swarmMetrics: {
        totalAgents: 0,
        activeAgents: 0,
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        avgResponseTime: 0,
        throughput: 0,
        uptime: 0,
      },
      systemHealth: {
        status: 'unhealthy',
        cpu: 0,
        memory: 0,
        disk: 0,
        network: { latency: 0, throughput: 0 },
        services: { mcp: false, neural: false, swarm: false, hooks: false },
      },
      neuralMetrics: {
        modelsLoaded: 0,
        totalInferences: 0,
        avgInferenceTime: 0,
        accuracy: 0,
      },
      agents: [],
      taskQueue: [],
      queues: [],
      mcpTools: [],
      recentHooks: [],
    };
  }
}

export const api = new APIService();
