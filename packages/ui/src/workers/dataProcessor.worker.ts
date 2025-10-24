/**
 * Web Worker for Heavy Data Processing
 *
 * Offloads expensive computations from main thread:
 * - Data aggregation and transformation
 * - CSV/JSON parsing
 * - Statistical calculations
 * - Chart data preparation
 */

interface WorkerMessage {
  id: string;
  type: string;
  payload: any;
}

interface WorkerResponse {
  id: string;
  type: string;
  result?: any;
  error?: string;
}

interface ChartDataPoint {
  x: number;
  y: number;
  original?: any;
}

type TransformerFunction = (item: any, index: number) => any;

// CSV parsing
function parseCSV(csvText: string): any[] {
  const lines = csvText.trim().split('\n');
  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const data: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const row: any = {};

    headers.forEach((header, index) => {
      const value = values[index]?.trim();
      // Try to parse as number
      row[header] = isNaN(Number(value)) ? value : Number(value);
    });

    data.push(row);
  }

  return data;
}

// Aggregate data into time buckets
function aggregateByTime(
  data: any[],
  timeField: string,
  valueField: string,
  bucketSize: number // milliseconds
): any[] {
  const buckets = new Map<number, { sum: number; count: number; timestamp: number }>();

  for (const item of data) {
    const timestamp = new Date(item[timeField]).getTime();
    const bucketKey = Math.floor(timestamp / bucketSize) * bucketSize;

    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, { sum: 0, count: 0, timestamp: bucketKey });
    }

    const bucket = buckets.get(bucketKey)!;
    bucket.sum += item[valueField] || 0;
    bucket.count += 1;
  }

  return Array.from(buckets.values())
    .map(bucket => ({
      timestamp: bucket.timestamp,
      value: bucket.sum / bucket.count,
      count: bucket.count,
    }))
    .sort((a, b) => a.timestamp - b.timestamp);
}

// Calculate moving average
function movingAverage(data: number[], windowSize: number): number[] {
  const result: number[] = [];

  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const window = data.slice(start, i + 1);
    const avg = window.reduce((sum, val) => sum + val, 0) / window.length;
    result.push(avg);
  }

  return result;
}

// Statistical calculations
function calculateStats(data: number[]): {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
} {
  if (data.length === 0) {
    return {
      mean: 0,
      median: 0,
      stdDev: 0,
      min: 0,
      max: 0,
      p50: 0,
      p95: 0,
      p99: 0,
    };
  }

  const sorted = [...data].sort((a, b) => a - b);
  const sum = data.reduce((acc, val) => acc + val, 0);
  const mean = sum / data.length;

  const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / data.length;
  const stdDev = Math.sqrt(variance);

  const percentile = (p: number) => {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  };

  return {
    mean,
    median: percentile(50),
    stdDev,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    p50: percentile(50),
    p95: percentile(95),
    p99: percentile(99),
  };
}

// Downsample data using LTTB algorithm
function downsampleLTTB(
  data: ChartDataPoint[],
  threshold: number
): ChartDataPoint[] {
  if (data.length <= threshold) return data;

  const sampled: ChartDataPoint[] = [];
  const bucketSize = (data.length - 2) / (threshold - 2);

  sampled.push(data[0]);

  let a = 0;

  for (let i = 0; i < threshold - 2; i++) {
    const avgRangeStart = Math.floor((i + 1) * bucketSize) + 1;
    const avgRangeEnd = Math.floor((i + 2) * bucketSize) + 1;
    const avgRangeLength = Math.min(avgRangeEnd, data.length) - avgRangeStart;

    let avgX = 0;
    let avgY = 0;

    for (let j = avgRangeStart; j < Math.min(avgRangeEnd, data.length); j++) {
      avgX += data[j].x;
      avgY += data[j].y;
    }

    avgX /= avgRangeLength;
    avgY /= avgRangeLength;

    const rangeStart = Math.floor(i * bucketSize) + 1;
    const rangeEnd = Math.floor((i + 1) * bucketSize) + 1;

    const pointA = data[a];
    let maxArea = -1;
    let maxAreaPoint = 0;

    for (let j = rangeStart; j < rangeEnd; j++) {
      const area = Math.abs(
        (pointA.x - avgX) * (data[j].y - pointA.y) -
        (pointA.x - data[j].x) * (avgY - pointA.y)
      ) * 0.5;

      if (area > maxArea) {
        maxArea = area;
        maxAreaPoint = j;
      }
    }

    sampled.push(data[maxAreaPoint]);
    a = maxAreaPoint;
  }

  sampled.push(data[data.length - 1]);

  return sampled;
}

// Transform data for chart rendering
function transformForChart(
  data: any[],
  xField: string,
  yField: string,
  options: {
    downsample?: boolean;
    threshold?: number;
    aggregate?: boolean;
    bucketSize?: number;
  } = {}
): ChartDataPoint[] {
  let transformed: ChartDataPoint[] = data.map(item => ({
    x: typeof item[xField] === 'number' ? item[xField] : new Date(item[xField]).getTime(),
    y: item[yField] || 0,
    original: item,
  }));

  if (options.aggregate && options.bucketSize) {
    // Aggregate into time buckets
    const buckets = new Map<number, { sum: number; count: number; items: any[] }>();

    for (const point of transformed) {
      const bucketKey = Math.floor(point.x / options.bucketSize) * options.bucketSize;

      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, { sum: 0, count: 0, items: [] });
      }

      const bucket = buckets.get(bucketKey)!;
      bucket.sum += point.y;
      bucket.count += 1;
      bucket.items.push(point.original);
    }

    transformed = Array.from(buckets.entries())
      .map(([x, bucket]) => ({
        x,
        y: bucket.sum / bucket.count,
        original: bucket.items[0],
      }))
      .sort((a, b) => a.x - b.x);
  }

  if (options.downsample && options.threshold && transformed.length > options.threshold) {
    transformed = downsampleLTTB(transformed, options.threshold);
  }

  return transformed;
}

// Process large JSON data
function processJSON(jsonText: string): any {
  try {
    return JSON.parse(jsonText);
  } catch (error: any) {
    throw new Error(`JSON parse error: ${error.message}`);
  }
}

// Batch process array transformations
function batchTransform(
  data: any[],
  transformer: TransformerFunction,
  batchSize: number = 1000
): any[] {
  const result: any[] = [];

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const transformed = batch.map((item, index) => transformer(item, i + index));
    result.push(...transformed);
  }

  return result;
}

// Message handler
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { id, type, payload } = event.data;

  try {
    let result: any;

    switch (type) {
      case 'parseCSV':
        result = parseCSV(payload.csvText);
        break;

      case 'parseJSON':
        result = processJSON(payload.jsonText);
        break;

      case 'aggregateByTime':
        result = aggregateByTime(
          payload.data,
          payload.timeField,
          payload.valueField,
          payload.bucketSize
        );
        break;

      case 'movingAverage':
        result = movingAverage(payload.data, payload.windowSize);
        break;

      case 'calculateStats':
        result = calculateStats(payload.data);
        break;

      case 'downsample':
        result = downsampleLTTB(payload.data, payload.threshold);
        break;

      case 'transformForChart':
        result = transformForChart(
          payload.data,
          payload.xField,
          payload.yField,
          payload.options
        );
        break;

      case 'batchTransform':
        result = batchTransform(
          payload.data,
          new Function('item', 'index', `return (${payload.transformerCode})(item, index)`) as TransformerFunction,
          payload.batchSize
        );
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }

    const response: WorkerResponse = { id, type, result };
    self.postMessage(response);

  } catch (error: any) {
    const response: WorkerResponse = {
      id,
      type,
      error: error.message || 'Unknown error',
    };
    self.postMessage(response);
  }
};

// Export type for TypeScript
export type DataProcessorWorker = typeof self;
