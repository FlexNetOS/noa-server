/**
 * High-Performance Canvas Renderer for Large Datasets
 *
 * Optimized for rendering 10k+ data points using Canvas API
 * Includes batch operations, offscreen rendering, and RAF optimization
 */

export interface DataPoint {
  x: number;
  y: number;
  timestamp?: number;
  label?: string;
}

export interface RenderConfig {
  width: number;
  height: number;
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  colors: {
    line: string;
    fill?: string;
    grid?: string;
    axis?: string;
  };
  showGrid?: boolean;
  showAxes?: boolean;
  lineWidth?: number;
  smooth?: boolean;
  downsample?: boolean;
  downsampleThreshold?: number;
}

export interface ChartBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * High-performance canvas-based chart renderer
 */
export class CanvasChartRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreenCanvas?: OffscreenCanvas;
  private offscreenCtx?: OffscreenCanvasRenderingContext2D;
  private animationFrameId?: number;
  private isDirty = false;
  private data: DataPoint[] = [];
  private config: RenderConfig;
  private bounds?: ChartBounds;

  constructor(canvas: HTMLCanvasElement, config: Partial<RenderConfig> = {}) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', {
      alpha: false,
      desynchronized: true, // Better performance for animations
    });

    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }

    this.ctx = ctx;
    this.config = this.mergeConfig(config);

    // Setup offscreen canvas for complex rendering
    if (typeof OffscreenCanvas !== 'undefined') {
      this.offscreenCanvas = new OffscreenCanvas(canvas.width, canvas.height);
      this.offscreenCtx = this.offscreenCanvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
    }

    // Enable high-DPI rendering
    this.setupHighDPI();
  }

  private mergeConfig(config: Partial<RenderConfig>): RenderConfig {
    return {
      width: config.width || 800,
      height: config.height || 400,
      padding: config.padding || { top: 20, right: 20, bottom: 40, left: 60 },
      colors: {
        line: config.colors?.line || '#22c55e',
        fill: config.colors?.fill,
        grid: config.colors?.grid || '#334155',
        axis: config.colors?.axis || '#94a3b8',
      },
      showGrid: config.showGrid !== false,
      showAxes: config.showAxes !== false,
      lineWidth: config.lineWidth || 2,
      smooth: config.smooth !== false,
      downsample: config.downsample !== false,
      downsampleThreshold: config.downsampleThreshold || 1000,
    };
  }

  private setupHighDPI() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;

    this.ctx.scale(dpr, dpr);

    if (this.offscreenCanvas && this.offscreenCtx) {
      this.offscreenCanvas.width = this.canvas.width;
      this.offscreenCanvas.height = this.canvas.height;
      this.offscreenCtx.scale(dpr, dpr);
    }
  }

  /**
   * Update chart data with automatic downsampling for large datasets
   */
  setData(data: DataPoint[]) {
    const processedData = this.config.downsample && data.length > this.config.downsampleThreshold!
      ? this.downsampleData(data, this.config.downsampleThreshold!)
      : data;

    this.data = processedData;
    this.bounds = this.calculateBounds(processedData);
    this.markDirty();
  }

  /**
   * Douglas-Peucker algorithm for intelligent downsampling
   * Preserves visual appearance while reducing point count
   */
  private downsampleData(data: DataPoint[], targetPoints: number): DataPoint[] {
    if (data.length <= targetPoints) return data;

    // Use LTTB (Largest Triangle Three Buckets) algorithm
    return this.lttbDownsample(data, targetPoints);
  }

  /**
   * Largest Triangle Three Buckets (LTTB) downsampling algorithm
   * Maintains visual characteristics better than naive sampling
   */
  private lttbDownsample(data: DataPoint[], threshold: number): DataPoint[] {
    if (data.length <= threshold) return data;

    const sampled: DataPoint[] = [];
    const bucketSize = (data.length - 2) / (threshold - 2);

    // Always include first point
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

    // Always include last point
    sampled.push(data[data.length - 1]);

    return sampled;
  }

  private calculateBounds(data: DataPoint[]): ChartBounds {
    if (data.length === 0) {
      return { minX: 0, maxX: 1, minY: 0, maxY: 1 };
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const point of data) {
      if (point.x < minX) minX = point.x;
      if (point.x > maxX) maxX = point.x;
      if (point.y < minY) minY = point.y;
      if (point.y > maxY) maxY = point.y;
    }

    // Add 5% padding to Y axis
    const yPadding = (maxY - minY) * 0.05;
    minY -= yPadding;
    maxY += yPadding;

    return { minX, maxX, minY, maxY };
  }

  private markDirty() {
    if (!this.isDirty) {
      this.isDirty = true;
      this.scheduleRender();
    }
  }

  private scheduleRender() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.animationFrameId = requestAnimationFrame(() => {
      this.render();
      this.isDirty = false;
      this.animationFrameId = undefined;
    });
  }

  /**
   * Main render method using batch operations
   */
  render() {
    if (!this.bounds) return;

    const ctx = this.offscreenCtx || this.ctx;
    const { width, height, padding } = this.config;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0f172a'; // Dark background
    ctx.fillRect(0, 0, width, height);

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Batch all drawing operations
    ctx.save();
    ctx.translate(padding.left, padding.top);

    if (this.config.showGrid) {
      this.drawGrid(ctx, chartWidth, chartHeight);
    }

    if (this.config.showAxes) {
      this.drawAxes(ctx, chartWidth, chartHeight);
    }

    this.drawLine(ctx, chartWidth, chartHeight);

    ctx.restore();

    // Copy offscreen canvas to main canvas if used
    if (this.offscreenCanvas && this.offscreenCtx) {
      this.ctx.drawImage(this.offscreenCanvas, 0, 0);
    }
  }

  private drawGrid(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, width: number, height: number) {
    ctx.strokeStyle = this.config.colors.grid!;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    const gridLines = 10;

    ctx.beginPath();

    // Vertical lines
    for (let i = 0; i <= gridLines; i++) {
      const x = (width / gridLines) * i;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }

    // Horizontal lines
    for (let i = 0; i <= gridLines; i++) {
      const y = (height / gridLines) * i;
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }

    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawAxes(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, width: number, height: number) {
    if (!this.bounds) return;

    ctx.strokeStyle = this.config.colors.axis!;
    ctx.fillStyle = this.config.colors.axis!;
    ctx.lineWidth = 1;
    ctx.font = '12px sans-serif';

    // Y-axis labels
    const yTicks = 5;
    for (let i = 0; i <= yTicks; i++) {
      const y = (height / yTicks) * i;
      const value = this.bounds.maxY - ((this.bounds.maxY - this.bounds.minY) / yTicks) * i;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(value.toFixed(1), -10, y);
    }

    // X-axis labels (time-based if timestamps available)
    const xTicks = 5;
    for (let i = 0; i <= xTicks; i++) {
      const x = (width / xTicks) * i;
      const value = this.bounds.minX + ((this.bounds.maxX - this.bounds.minX) / xTicks) * i;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(value.toFixed(0), x, height + 10);
    }
  }

  private drawLine(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, width: number, height: number) {
    if (!this.bounds || this.data.length === 0) return;

    const scaleX = (x: number) => ((x - this.bounds!.minX) / (this.bounds!.maxX - this.bounds!.minX)) * width;
    const scaleY = (y: number) => height - ((y - this.bounds!.minY) / (this.bounds!.maxY - this.bounds!.minY)) * height;

    // Draw fill area if configured
    if (this.config.colors.fill) {
      ctx.fillStyle = this.config.colors.fill;
      ctx.beginPath();
      ctx.moveTo(scaleX(this.data[0].x), height);
      ctx.lineTo(scaleX(this.data[0].x), scaleY(this.data[0].y));

      if (this.config.smooth) {
        this.drawSmoothPath(ctx, scaleX, scaleY);
      } else {
        for (let i = 1; i < this.data.length; i++) {
          ctx.lineTo(scaleX(this.data[i].x), scaleY(this.data[i].y));
        }
      }

      ctx.lineTo(scaleX(this.data[this.data.length - 1].x), height);
      ctx.closePath();
      ctx.fill();
    }

    // Draw line
    ctx.strokeStyle = this.config.colors.line;
    ctx.lineWidth = this.config.lineWidth!;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(scaleX(this.data[0].x), scaleY(this.data[0].y));

    if (this.config.smooth) {
      this.drawSmoothPath(ctx, scaleX, scaleY);
    } else {
      // Use batch drawing for better performance
      for (let i = 1; i < this.data.length; i++) {
        ctx.lineTo(scaleX(this.data[i].x), scaleY(this.data[i].y));
      }
    }

    ctx.stroke();
  }

  private drawSmoothPath(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    scaleX: (x: number) => number,
    scaleY: (y: number) => number
  ) {
    // Use quadratic curves for smooth line
    for (let i = 1; i < this.data.length - 1; i++) {
      const xc = (scaleX(this.data[i].x) + scaleX(this.data[i + 1].x)) / 2;
      const yc = (scaleY(this.data[i].y) + scaleY(this.data[i + 1].y)) / 2;
      ctx.quadraticCurveTo(scaleX(this.data[i].x), scaleY(this.data[i].y), xc, yc);
    }

    // Last segment
    if (this.data.length > 1) {
      const last = this.data[this.data.length - 1];
      const secondLast = this.data[this.data.length - 2];
      ctx.quadraticCurveTo(
        scaleX(secondLast.x),
        scaleY(secondLast.y),
        scaleX(last.x),
        scaleY(last.y)
      );
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RenderConfig>) {
    this.config = { ...this.config, ...config };
    this.markDirty();
  }

  /**
   * Resize canvas
   */
  resize(width: number, height: number) {
    this.config.width = width;
    this.config.height = height;
    this.setupHighDPI();
    this.markDirty();
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.offscreenCanvas = undefined;
    this.offscreenCtx = undefined;
  }

  /**
   * Get current data point count
   */
  getDataPointCount(): number {
    return this.data.length;
  }

  /**
   * Check if renderer is using downsampling
   */
  isDownsampled(): boolean {
    return this.config.downsample! && this.data.length >= this.config.downsampleThreshold!;
  }
}

/**
 * Factory function for easy instantiation
 */
export function createCanvasChart(
  canvasOrId: HTMLCanvasElement | string,
  config?: Partial<RenderConfig>
): CanvasChartRenderer {
  const canvas = typeof canvasOrId === 'string'
    ? document.getElementById(canvasOrId) as HTMLCanvasElement
    : canvasOrId;

  if (!canvas) {
    throw new Error('Canvas element not found');
  }

  return new CanvasChartRenderer(canvas, config);
}

/**
 * Generate test data for performance benchmarking
 */
export function generateTestData(count: number): DataPoint[] {
  const data: DataPoint[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    data.push({
      x: i,
      y: Math.sin(i / 100) * 50 + Math.random() * 10 + 100,
      timestamp: now + i * 1000,
    });
  }

  return data;
}
