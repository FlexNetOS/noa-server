import { AgentCard } from '@/components/AgentCard';
import { Header } from '@/components/Header';
import { MetricCard } from '@/components/MetricCard';
import { PerformanceCharts } from '@/components/PerformanceCharts';
import { PromptOptimizationMonitor } from '@/components/PromptOptimizationMonitor';
import { QueueMetricCards } from '@/components/QueueMetricCards';
import { QueueVisualization } from '@/components/QueueVisualization';
import { SwarmVisualization } from '@/components/SwarmVisualization';
import { SystemHealth } from '@/components/SystemHealth';
import { TaskQueue } from '@/components/TaskQueue';
import { useTelemetry } from '@/hooks/useTelemetry';
import { api } from '@/services/api';
import { useDashboardStore } from '@/services/store';
import { formatDuration, formatNumber, formatPercentage } from '@/utils/format';

function App() {
  const data = useTelemetry();
  const { fetchTelemetry, setAutoRefresh, autoRefresh, lastUpdate } = useDashboardStore();

  const handleToggleAutoRefresh = () => setAutoRefresh(!autoRefresh);
  const handleManualRefresh = () => fetchTelemetry();
  const handlePauseAgent = (id: string) => api.pauseAgent(id);
  const handleResumeAgent = (id: string) => api.resumeAgent(id);
  const handleCancelTask = (id: string) => api.cancelTask(id);

  if (data.isLoading && !lastUpdate) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-brand-muted">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg text-white">
      <Header
        lastUpdate={lastUpdate}
        autoRefresh={autoRefresh}
        onToggleAutoRefresh={handleToggleAutoRefresh}
        onManualRefresh={handleManualRefresh}
      />

      <main className="px-8 py-6 space-y-6">
        {/* Top Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Active Agents"
            value={`${data.swarmMetrics.activeAgents}/${data.swarmMetrics.totalAgents}`}
            subtitle="Currently processing"
            status="success"
            trend={{ value: 12, isPositive: true }}
          />
          <MetricCard
            title="Tasks Completed"
            value={formatNumber(data.swarmMetrics.completedTasks)}
            subtitle={`${data.swarmMetrics.failedTasks} failed`}
            status={data.swarmMetrics.failedTasks > 10 ? 'warning' : 'success'}
          />
          <MetricCard
            title="Avg Response Time"
            value={formatDuration(data.swarmMetrics.avgResponseTime)}
            subtitle="Last 100 tasks"
            status="info"
            trend={{ value: 8, isPositive: false }}
          />
          <MetricCard
            title="Throughput"
            value={`${data.swarmMetrics.throughput.toFixed(1)}`}
            subtitle="tasks/sec"
            status="success"
          />
        </div>

        {/* Queue Metrics */}
        <QueueMetricCards
          metrics={{
            totalMessages: data.swarmMetrics.totalTasks,
            messagesSent: data.swarmMetrics.totalTasks - data.swarmMetrics.completedTasks,
            messagesReceived: data.swarmMetrics.completedTasks,
            activeJobs: data.taskQueue.filter(t => t.status === 'running').length,
            queuedJobs: data.taskQueue.filter(t => t.status === 'pending').length,
            averageProcessingTime: data.swarmMetrics.avgResponseTime,
            throughput: data.swarmMetrics.throughput,
          }}
        />

        {/* Performance Charts */}
        <PerformanceCharts />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* System Health */}
          <div className="lg:col-span-1">
            <SystemHealth health={data.systemHealth} />
          </div>

          {/* Neural Metrics */}
          <div className="lg:col-span-2 bg-brand-card border border-brand-border rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Neural Processing Metrics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-brand-muted mb-1">Models Loaded</p>
                <p className="text-2xl font-bold text-white">{data.neuralMetrics.modelsLoaded}</p>
              </div>
              <div>
                <p className="text-sm text-brand-muted mb-1">Total Inferences</p>
                <p className="text-2xl font-bold text-white">
                  {formatNumber(data.neuralMetrics.totalInferences)}
                </p>
              </div>
              <div>
                <p className="text-sm text-brand-muted mb-1">Avg Inference</p>
                <p className="text-2xl font-bold text-white">
                  {data.neuralMetrics.avgInferenceTime}ms
                </p>
              </div>
              <div>
                <p className="text-sm text-brand-muted mb-1">Accuracy</p>
                <p className="text-2xl font-bold text-white">
                  {formatPercentage(data.neuralMetrics.accuracy)}
                </p>
              </div>
              {data.neuralMetrics.gpuUtilization !== undefined && (
                <>
                  <div>
                    <p className="text-sm text-brand-muted mb-1">GPU Usage</p>
                    <p className="text-2xl font-bold text-white">
                      {data.neuralMetrics.gpuUtilization}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-brand-muted mb-1">VRAM</p>
                    <p className="text-2xl font-bold text-white">
                      {data.neuralMetrics.vramUsage?.toFixed(1)} GB
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Prompt Optimization Monitor */}
        <PromptOptimizationMonitor />

        {/* Swarm Visualization */}
        <SwarmVisualization agents={data.agents} />

        {/* Queue Visualization */}
        <QueueVisualization queues={data.queues} />

        {/* Agents Grid */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Active Agents</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {data.agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onPause={handlePauseAgent}
                onResume={handleResumeAgent}
              />
            ))}
          </div>
        </div>

        {/* Task Queue */}
        <TaskQueue tasks={data.taskQueue} onCancel={handleCancelTask} />

        {/* Truth Gate Status */}
        {data.truthGate && (
          <div
            className={`border-2 rounded-lg p-6 ${
              data.truthGate.passed
                ? 'border-brand-success bg-brand-success/5'
                : 'border-brand-warning bg-brand-warning/5'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Queen Seraphina Truth Gate</h3>
                <p className="text-brand-muted">Verification System Status</p>
              </div>
              <div className="text-right">
                <p
                  className={`text-3xl font-bold ${data.truthGate.passed ? 'text-brand-success' : 'text-brand-warning'}`}
                >
                  {data.truthGate.passed ? 'PASS' : 'ATTENTION'}
                </p>
                <p className="text-sm text-brand-muted">
                  Accuracy: {formatPercentage(data.truthGate.accuracy)}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;