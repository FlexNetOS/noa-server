import { motion } from 'framer-motion';

import { MetricCard } from './MetricCard';
import { formatDuration, formatNumber } from '@/utils/format';

interface QueueMetrics {
  totalMessages: number;
  messagesSent: number;
  messagesReceived: number;
  activeJobs: number;
  queuedJobs: number;
  averageProcessingTime: number;
  throughput: number;
}

interface QueueMetricCardsProps {
  metrics: QueueMetrics;
}

export function QueueMetricCards({ metrics }: QueueMetricCardsProps) {
  const cards = [
    {
      title: 'Messages Processed',
      value: formatNumber(metrics.totalMessages),
      subtitle: `${metrics.messagesSent} sent, ${metrics.messagesReceived} received`,
      status: metrics.totalMessages > 0 ? 'success' : 'info',
      trend: { value: 5, isPositive: true }, // Mock trend, can be calculated from real data
    },
    {
      title: 'Queue Depth',
      value: formatNumber(metrics.activeJobs + metrics.queuedJobs),
      subtitle: `${metrics.activeJobs} active, ${metrics.queuedJobs} queued`,
      status: metrics.queuedJobs > 10 ? 'warning' : 'success',
    },
    {
      title: 'Avg Processing Time',
      value: formatDuration(metrics.averageProcessingTime),
      subtitle: 'Per message',
      status: 'info',
      trend: { value: 3, isPositive: false }, // Mock trend
    },
    {
      title: 'Throughput',
      value: `${metrics.throughput.toFixed(1)}`,
      subtitle: 'messages/sec',
      status: 'success',
      trend: { value: 8, isPositive: true }, // Mock trend
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          <MetricCard
            title={card.title}
            value={card.value}
            subtitle={card.subtitle}
            status={card.status as any}
            trend={card.trend}
          />
        </motion.div>
      ))}
    </div>
  );
}
