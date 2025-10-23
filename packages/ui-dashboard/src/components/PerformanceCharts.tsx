import { useState, useEffect } from 'react';

import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DataPoint {
  time: string;
  value: number;
  value2?: number;
}

export function PerformanceCharts() {
  const [responseTimeData, setResponseTimeData] = useState<DataPoint[]>([]);
  const [throughputData, setThroughputData] = useState<DataPoint[]>([]);

  useEffect(() => {
    // Generate sample data (would come from real telemetry)
    const generateData = () => {
      const now = Date.now();
      const data: DataPoint[] = [];
      for (let i = 20; i >= 0; i--) {
        data.push({
          time: new Date(now - i * 5000).toLocaleTimeString(),
          value: Math.floor(Math.random() * 100) + 150,
          value2: Math.floor(Math.random() * 30) + 10,
        });
      }
      return data;
    };

    setResponseTimeData(generateData());
    setThroughputData(generateData());

    const interval = setInterval(() => {
      setResponseTimeData((prev) => {
        const newData = [
          ...prev.slice(1),
          {
            time: new Date().toLocaleTimeString(),
            value: Math.floor(Math.random() * 100) + 150,
            value2: Math.floor(Math.random() * 30) + 10,
          },
        ];
        return newData;
      });

      setThroughputData((prev) => {
        const newData = [
          ...prev.slice(1),
          {
            time: new Date().toLocaleTimeString(),
            value: Math.floor(Math.random() * 50) + 10,
            value2: Math.floor(Math.random() * 30) + 5,
          },
        ];
        return newData;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Response Time Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-brand-card border border-brand-border rounded-lg p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Response Time (ms)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={responseTimeData}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="time" stroke="#94a3b8" style={{ fontSize: '12px' }} />
            <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
              }}
              labelStyle={{ color: '#94a3b8' }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#fbbf24"
              fillOpacity={1}
              fill="url(#colorValue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Throughput Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-brand-card border border-brand-border rounded-lg p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Throughput (tasks/sec)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={throughputData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="time" stroke="#94a3b8" style={{ fontSize: '12px' }} />
            <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
              }}
              labelStyle={{ color: '#94a3b8' }}
            />
            <Line type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={2} dot={false} />
            <Line
              type="monotone"
              dataKey="value2"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              strokeDasharray="5 5"
            />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
}
