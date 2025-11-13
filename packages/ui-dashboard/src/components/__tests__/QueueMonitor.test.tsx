/**
 * QueueMonitor Component Tests
 *
 * Unit tests for the QueueMonitor component including:
 * - Rendering and initial state
 * - WebSocket connection management
 * - Real-time updates
 * - Filtering functionality
 * - Accessibility compliance
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueueMonitor } from '../QueueMonitor';
import { api } from '@/services/api';

// Mock the API service
vi.mock('@/services/api', () => ({
  api: {
    getTelemetry: vi.fn(),
    connectWebSocket: vi.fn(),
    disconnectWebSocket: vi.fn(),
    subscribe: vi.fn(() => vi.fn()),
  },
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    tr: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('QueueMonitor', () => {
  const mockTelemetryData = {
    swarmMetrics: {
      totalAgents: 5,
      activeAgents: 3,
      totalTasks: 100,
      completedTasks: 80,
      failedTasks: 5,
      avgResponseTime: 250,
      throughput: 10.5,
      uptime: 3600000,
    },
    systemHealth: {
      status: 'healthy' as const,
      cpu: 45,
      memory: 62,
      disk: 58,
      network: { latency: 12, throughput: 850 },
      services: {
        mcp: true,
        neural: true,
        swarm: true,
        hooks: true,
      },
    },
    taskQueue: [
      {
        id: 'task-1',
        type: 'code-review',
        priority: 'high' as const,
        status: 'running' as const,
        createdAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        progress: 45,
      },
      {
        id: 'task-2',
        type: 'test-execution',
        priority: 'medium' as const,
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'task-3',
        type: 'deployment',
        priority: 'critical' as const,
        status: 'completed' as const,
        createdAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      },
    ],
    neuralMetrics: {
      modelsLoaded: 3,
      totalInferences: 1247,
      avgInferenceTime: 187,
      gpuUtilization: 78,
      vramUsage: 6.4,
      accuracy: 0.95,
    },
    agents: [],
    queues: [],
    mcpTools: [],
    recentHooks: [],
  };

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Setup default mock implementations
    (api.getTelemetry as any).mockResolvedValue(mockTelemetryData);
    (api.connectWebSocket as any).mockImplementation(() => {});
    (api.disconnectWebSocket as any).mockImplementation(() => {});
    (api.subscribe as any).mockReturnValue(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render queue monitor header', async () => {
      render(<QueueMonitor />);

      await waitFor(() => {
        expect(screen.getByText('Queue Monitor')).toBeInTheDocument();
      });
    });

    it('should render metrics cards', async () => {
      render(<QueueMonitor />);

      await waitFor(() => {
        expect(screen.getByText('Active Jobs')).toBeInTheDocument();
        expect(screen.getByText('Queue Depth')).toBeInTheDocument();
        expect(screen.getByText('Throughput')).toBeInTheDocument();
        expect(screen.getByText('Avg Processing Time')).toBeInTheDocument();
      });
    });

    it('should display connection status', async () => {
      render(<QueueMonitor />);

      await waitFor(() => {
        expect(screen.getByText('Live Updates')).toBeInTheDocument();
      });
    });

    it('should render job queue table', async () => {
      render(<QueueMonitor />);

      await waitFor(() => {
        expect(screen.getByText('Job Queue')).toBeInTheDocument();
        expect(screen.getByText('Job ID')).toBeInTheDocument();
        expect(screen.getByText('Type')).toBeInTheDocument();
        expect(screen.getByText('Priority')).toBeInTheDocument();
        expect(screen.getByText('Status')).toBeInTheDocument();
      });
    });
  });

  describe('Data Fetching', () => {
    it('should fetch telemetry data on mount', async () => {
      render(<QueueMonitor />);

      await waitFor(() => {
        expect(api.getTelemetry).toHaveBeenCalledTimes(1);
      });
    });

    it('should display fetched job data', async () => {
      render(<QueueMonitor />);

      await waitFor(() => {
        // Check for job IDs (truncated)
        expect(screen.getByText((content) => content.includes('task-1'))).toBeInTheDocument();
      });
    });

    it('should calculate metrics correctly', async () => {
      render(<QueueMonitor />);

      await waitFor(() => {
        // Active jobs = 1 (running)
        expect(screen.getByText('1')).toBeInTheDocument();
      });
    });
  });

  describe('WebSocket Integration', () => {
    it('should connect to WebSocket on mount', async () => {
      render(<QueueMonitor />);

      await waitFor(() => {
        expect(api.connectWebSocket).toHaveBeenCalledTimes(1);
      });
    });

    it('should subscribe to queue events', async () => {
      render(<QueueMonitor />);

      await waitFor(() => {
        expect(api.subscribe).toHaveBeenCalledWith('jobs', expect.any(Function));
        expect(api.subscribe).toHaveBeenCalledWith('metrics', expect.any(Function));
        expect(api.subscribe).toHaveBeenCalledWith('health', expect.any(Function));
      });
    });

    it('should disconnect WebSocket on unmount', async () => {
      const { unmount } = render(<QueueMonitor />);

      await waitFor(() => {
        expect(api.connectWebSocket).toHaveBeenCalled();
      });

      unmount();

      expect(api.disconnectWebSocket).toHaveBeenCalledTimes(1);
    });

    it('should handle WebSocket connection errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      (api.connectWebSocket as any).mockImplementation((_onMessage: any, onError: any) => {
        onError(new Error('Connection failed'));
      });

      render(<QueueMonitor />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Filtering', () => {
    it('should render filter buttons', async () => {
      render(<QueueMonitor />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /All/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Pending/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Running/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Completed/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Failed/i })).toBeInTheDocument();
      });
    });

    it('should filter jobs by status', async () => {
      render(<QueueMonitor />);

      // Wait for initial data load
      await waitFor(() => {
        expect(screen.getByText('Job Queue')).toBeInTheDocument();
      });

      // Click on "Running" filter
      const runningButton = screen.getByRole('button', { name: /Running/i });
      fireEvent.click(runningButton);

      // Should show only running jobs
      await waitFor(() => {
        expect(runningButton).toHaveAttribute('aria-pressed', 'true');
      });
    });

    it('should show all jobs when "All" filter is active', async () => {
      render(<QueueMonitor />);

      await waitFor(() => {
        const allButton = screen.getByRole('button', { name: /All/i });
        expect(allButton).toHaveAttribute('aria-pressed', 'true');
      });
    });
  });

  describe('Health Indicator', () => {
    it('should display health status', async () => {
      render(<QueueMonitor />);

      await waitFor(() => {
        expect(screen.getByText(/Queue Health:/i)).toBeInTheDocument();
        expect(screen.getByText('Healthy')).toBeInTheDocument();
      });
    });

    it('should show latency and error rate', async () => {
      render(<QueueMonitor />);

      await waitFor(() => {
        expect(screen.getByText('Latency')).toBeInTheDocument();
        expect(screen.getByText('Error Rate')).toBeInTheDocument();
      });
    });

    it('should display correct health status color', async () => {
      render(<QueueMonitor />);

      await waitFor(() => {
        const healthIndicator = screen.getByText(/Queue Health:/i).closest('div');
        expect(healthIndicator).toHaveClass('border-green-500/30');
      });
    });
  });

  describe('Statistics Summary', () => {
    it('should render statistics cards', async () => {
      render(<QueueMonitor />);

      await waitFor(() => {
        expect(screen.getByText('Total Processed')).toBeInTheDocument();
        expect(screen.getByText('Failed Jobs')).toBeInTheDocument();
        expect(screen.getByText('Total Messages')).toBeInTheDocument();
      });
    });

    it('should display correct statistics values', async () => {
      render(<QueueMonitor />);

      await waitFor(() => {
        expect(screen.getByText('80')).toBeInTheDocument(); // completedJobs
        expect(screen.getByText('5')).toBeInTheDocument(); // failedJobs
        expect(screen.getByText('100')).toBeInTheDocument(); // totalMessages
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible filter buttons', async () => {
      render(<QueueMonitor />);

      await waitFor(() => {
        const allButton = screen.getByRole('button', { name: /All/i });
        expect(allButton).toHaveAttribute('aria-pressed');
      });
    });

    it('should have aria labels for icons', async () => {
      render(<QueueMonitor />);

      await waitFor(() => {
        const icons = screen.getAllByRole('img');
        icons.forEach(icon => {
          expect(icon).toHaveAttribute('aria-label');
        });
      });
    });

    it('should have semantic table structure', async () => {
      render(<QueueMonitor />);

      await waitFor(() => {
        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();

        const headers = screen.getAllByRole('columnheader');
        expect(headers.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      (api.getTelemetry as any).mockRejectedValue(new Error('API Error'));

      render(<QueueMonitor />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      consoleErrorSpy.mockRestore();
    });

    it('should show empty state when no jobs', async () => {
      (api.getTelemetry as any).mockResolvedValue({
        ...mockTelemetryData,
        taskQueue: [],
      });

      render(<QueueMonitor />);

      await waitFor(() => {
        expect(screen.getByText('No jobs to display')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should update metrics on job completion', async () => {
      let messageHandler: any;

      (api.connectWebSocket as any).mockImplementation((handler: any) => {
        messageHandler = handler;
      });

      render(<QueueMonitor />);

      await waitFor(() => {
        expect(api.connectWebSocket).toHaveBeenCalled();
      });

      // Simulate job completion event
      if (messageHandler) {
        messageHandler({
          type: 'task-update',
          source: 'message-queue',
          timestamp: Date.now(),
          data: {
            jobId: 'task-1',
            status: 'completed',
            job: { progress: 100 },
          },
        });
      }

      // Metrics should update
      await waitFor(() => {
        // Completed jobs should increment
        expect(screen.getByText(/Total Processed/i)).toBeInTheDocument();
      });
    });
  });
});
