/**
 * AI Metrics Dashboard Tests
 * Comprehensive test suite for dashboard components
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AIMetricsProvider } from '../context/AIMetricsContext';
import { AIMetricsDashboard } from '../AIMetricsDashboard';
import { ProviderHealthMonitor } from '../ProviderHealthMonitor';
import { CostAnalyticsDashboard } from '../CostAnalyticsDashboard';
import { AIJobQueueMonitor } from '../AIJobQueueMonitor';
import { ModelComparisonChart } from '../ModelComparisonChart';

// Mock data
const mockMetrics = [
  {
    timestamp: Date.now() - 60000,
    latency: 95,
    throughput: 12.5,
    errorRate: 0.02,
    successRate: 0.98,
    totalRequests: 1500
  },
  {
    timestamp: Date.now(),
    latency: 102,
    throughput: 13.2,
    errorRate: 0.015,
    successRate: 0.985,
    totalRequests: 1650
  }
];

const mockProviderMetrics = [
  {
    providerId: 'claude-1',
    providerName: 'Claude',
    status: 'healthy' as const,
    availability: 0.999,
    responseTime: 95,
    circuitBreakerState: 'closed' as const,
    timestamp: Date.now(),
    latency: 95,
    throughput: 10,
    errorRate: 0.01,
    successRate: 0.99,
    totalRequests: 1000
  },
  {
    providerId: 'llama-1',
    providerName: 'Llama.cpp',
    status: 'healthy' as const,
    availability: 0.995,
    responseTime: 85,
    circuitBreakerState: 'closed' as const,
    timestamp: Date.now(),
    latency: 85,
    throughput: 15,
    errorRate: 0.005,
    successRate: 0.995,
    totalRequests: 1500
  }
];

const mockCostMetrics = {
  timestamp: Date.now(),
  totalCost: 1250.50,
  dailyCost: 45.30,
  monthlyCost: 890.75,
  costByProvider: {
    'Claude': 450.25,
    'Llama.cpp': 440.50
  },
  costByModel: {
    'claude-3-opus': 250.30,
    'claude-3-sonnet': 199.95,
    'llama-3-70b': 440.50
  },
  costByUser: {
    'user-1': 300.25,
    'user-2': 590.50
  },
  cacheSavings: 125.50,
  forecastedMonthlyCost: 950.00
};

const mockQueueMetrics = {
  queueDepth: 45,
  queuedJobs: 30,
  processingJobs: 15,
  completedJobs: 5420,
  failedJobs: 12,
  deadLetterQueueDepth: 2,
  avgProcessingTime: 145,
  workerUtilization: 0.65,
  priorityDistribution: {
    'high': 12,
    'medium': 20,
    'low': 13
  },
  latencyPercentiles: {
    p50: 120,
    p95: 250,
    p99: 400
  }
};

const mockModelPerformance = [
  {
    modelId: 'claude-3-opus',
    modelName: 'Claude 3 Opus',
    provider: 'Anthropic',
    qualityScore: 0.95,
    avgResponseTime: 120,
    costPerRequest: 0.015,
    requestCount: 2500,
    errorRate: 0.01,
    lastUpdated: Date.now()
  },
  {
    modelId: 'llama-3-70b',
    modelName: 'Llama 3 70B',
    provider: 'Local',
    qualityScore: 0.88,
    avgResponseTime: 95,
    costPerRequest: 0.002,
    requestCount: 3200,
    errorRate: 0.008,
    lastUpdated: Date.now()
  }
];

const mockAlerts = [
  {
    id: 'alert-1',
    severity: 'warning' as const,
    title: 'High Queue Depth',
    message: 'Queue depth exceeded threshold (45 > 40)',
    timestamp: Date.now() - 30000,
    acknowledged: false,
    source: 'queue-monitor'
  }
];

// Mock fetch globally
global.fetch = jest.fn((url) => {
  if (url.includes('/metrics/ai')) {
    return Promise.resolve({
      ok: true,
      json: async () => mockMetrics
    } as Response);
  }
  if (url.includes('/metrics/providers')) {
    return Promise.resolve({
      ok: true,
      json: async () => mockProviderMetrics
    } as Response);
  }
  if (url.includes('/metrics/costs')) {
    return Promise.resolve({
      ok: true,
      json: async () => mockCostMetrics
    } as Response);
  }
  if (url.includes('/metrics/queue')) {
    return Promise.resolve({
      ok: true,
      json: async () => mockQueueMetrics
    } as Response);
  }
  if (url.includes('/metrics/models')) {
    return Promise.resolve({
      ok: true,
      json: async () => mockModelPerformance
    } as Response);
  }
  if (url.includes('/alerts')) {
    return Promise.resolve({
      ok: true,
      json: async () => mockAlerts
    } as Response);
  }
  return Promise.reject(new Error('Not found'));
});

// Test wrapper with providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AIMetricsProvider config={{ enableWebSocket: false }}>
        {children}
      </AIMetricsProvider>
    </QueryClientProvider>
  );
};

describe('AIMetricsDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders dashboard with loading state', () => {
    render(
      <TestWrapper>
        <AIMetricsDashboard />
      </TestWrapper>
    );

    expect(screen.getByText('AI Metrics Dashboard')).toBeInTheDocument();
  });

  test('displays key metrics after loading', async () => {
    render(
      <TestWrapper>
        <AIMetricsDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Average Latency')).toBeInTheDocument();
      expect(screen.getByText('Throughput')).toBeInTheDocument();
      expect(screen.getByText('Total Requests')).toBeInTheDocument();
      expect(screen.getByText('Success Rate')).toBeInTheDocument();
    });
  });

  test('shows provider health status', async () => {
    render(
      <TestWrapper>
        <AIMetricsDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Provider Health')).toBeInTheDocument();
      expect(screen.getByText('Claude')).toBeInTheDocument();
      expect(screen.getByText('Llama.cpp')).toBeInTheDocument();
    });
  });

  test('displays cost metrics', async () => {
    render(
      <TestWrapper>
        <AIMetricsDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Cost Analytics')).toBeInTheDocument();
      expect(screen.getByText('Cache Savings')).toBeInTheDocument();
    });
  });

  test('handles refresh button click', async () => {
    render(
      <TestWrapper>
        <AIMetricsDashboard />
      </TestWrapper>
    );

    const refreshButton = await screen.findByText('Refresh');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  test('displays alerts when present', async () => {
    render(
      <TestWrapper>
        <AIMetricsDashboard showAlerts />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('High Queue Depth')).toBeInTheDocument();
      expect(screen.getByText(/Queue depth exceeded threshold/)).toBeInTheDocument();
    });
  });
});

describe('ProviderHealthMonitor', () => {
  test('renders provider status correctly', async () => {
    render(
      <TestWrapper>
        <ProviderHealthMonitor />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Provider Health Monitor')).toBeInTheDocument();
      expect(screen.getByText('Claude')).toBeInTheDocument();
      expect(screen.getByText('Llama.cpp')).toBeInTheDocument();
    });
  });

  test('displays response time metrics', async () => {
    render(
      <TestWrapper>
        <ProviderHealthMonitor showResponseTime />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Response Time').length).toBeGreaterThan(0);
    });
  });

  test('shows circuit breaker status', async () => {
    render(
      <TestWrapper>
        <ProviderHealthMonitor showCircuitBreaker />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getAllByText(/Circuit Breaker/).length).toBeGreaterThan(0);
    });
  });
});

describe('CostAnalyticsDashboard', () => {
  test('renders cost overview', async () => {
    render(
      <TestWrapper>
        <CostAnalyticsDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Cost Analytics')).toBeInTheDocument();
      expect(screen.getByText('Total Cost')).toBeInTheDocument();
      expect(screen.getByText('Daily Cost')).toBeInTheDocument();
      expect(screen.getByText('Monthly Cost')).toBeInTheDocument();
    });
  });

  test('switches between breakdown views', async () => {
    render(
      <TestWrapper>
        <CostAnalyticsDashboard showBreakdown />
      </TestWrapper>
    );

    await waitFor(() => {
      const providerButton = screen.getByText('By Provider');
      const modelButton = screen.getByText('By Model');
      const userButton = screen.getByText('By User');

      expect(providerButton).toBeInTheDocument();
      expect(modelButton).toBeInTheDocument();
      expect(userButton).toBeInTheDocument();

      fireEvent.click(modelButton);
      fireEvent.click(userButton);
    });
  });
});

describe('AIJobQueueMonitor', () => {
  test('renders queue metrics', async () => {
    render(
      <TestWrapper>
        <AIJobQueueMonitor />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('AI Job Queue Monitor')).toBeInTheDocument();
      expect(screen.getByText('Queue Depth')).toBeInTheDocument();
      expect(screen.getByText('Processing')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });
  });

  test('shows dead letter queue alert', async () => {
    render(
      <TestWrapper>
        <AIJobQueueMonitor />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Dead Letter Queue Alert')).toBeInTheDocument();
    });
  });

  test('displays worker utilization', async () => {
    render(
      <TestWrapper>
        <AIJobQueueMonitor showWorkerUtilization />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Worker Pool Utilization')).toBeInTheDocument();
    });
  });

  test('shows latency percentiles', async () => {
    render(
      <TestWrapper>
        <AIJobQueueMonitor showLatencyPercentiles />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Job Latency Percentiles')).toBeInTheDocument();
    });
  });
});

describe('ModelComparisonChart', () => {
  test('renders model comparison', async () => {
    render(
      <TestWrapper>
        <ModelComparisonChart />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Model Performance Comparison')).toBeInTheDocument();
      expect(screen.getByText(/Select models to compare/)).toBeInTheDocument();
    });
  });

  test('allows model selection', async () => {
    render(
      <TestWrapper>
        <ModelComparisonChart />
      </TestWrapper>
    );

    await waitFor(() => {
      const modelButton = screen.getByText(/Claude 3 Opus/);
      fireEvent.click(modelButton);
    });
  });

  test('displays comparison table', async () => {
    render(
      <TestWrapper>
        <ModelComparisonChart showTable />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Detailed Comparison Table')).toBeInTheDocument();
    });
  });

  test('changes sort order', async () => {
    render(
      <TestWrapper>
        <ModelComparisonChart />
      </TestWrapper>
    );

    await waitFor(() => {
      const sortSelect = screen.getByRole('combobox');
      fireEvent.change(sortSelect, { target: { value: 'speed' } });
      fireEvent.change(sortSelect, { target: { value: 'cost' } });
    });
  });
});

describe('Accessibility', () => {
  test('dashboard has proper ARIA labels', async () => {
    render(
      <TestWrapper>
        <AIMetricsDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      const refreshButton = screen.getByText('Refresh');
      expect(refreshButton).toHaveAttribute('type', 'button');
    });
  });

  test('alerts are announced with role="alert"', async () => {
    render(
      <TestWrapper>
        <AIMetricsDashboard showAlerts />
      </TestWrapper>
    );

    await waitFor(() => {
      const alerts = screen.getAllByRole('alert');
      expect(alerts.length).toBeGreaterThan(0);
    });
  });
});

describe('Responsive Design', () => {
  test('renders on mobile viewport', () => {
    global.innerWidth = 375;
    global.innerHeight = 667;

    render(
      <TestWrapper>
        <AIMetricsDashboard />
      </TestWrapper>
    );

    expect(screen.getByText('AI Metrics Dashboard')).toBeInTheDocument();
  });

  test('renders on tablet viewport', () => {
    global.innerWidth = 768;
    global.innerHeight = 1024;

    render(
      <TestWrapper>
        <AIMetricsDashboard />
      </TestWrapper>
    );

    expect(screen.getByText('AI Metrics Dashboard')).toBeInTheDocument();
  });
});
