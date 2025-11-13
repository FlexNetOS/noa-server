/**
 * Chart Export Utilities
 * Functions to export charts as PNG, SVG, or CSV
 */

import type { ExportOptions, ChartDataPoint } from '../types/charts';

/**
 * Export chart to PNG using canvas
 */
export async function exportToPNG(
  svgElement: SVGSVGElement,
  options: ExportOptions
): Promise<void> {
  const { filename = 'chart', quality = 0.95 } = options;

  try {
    // Create canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    // Get SVG dimensions
    const bbox = svgElement.getBBox();
    canvas.width = bbox.width;
    canvas.height = bbox.height;

    // Convert SVG to data URL
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    // Load SVG into image
    const img = new Image();
    img.onload = () => {
      // Draw to canvas
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // Download PNG
      canvas.toBlob(
        (blob) => {
          if (blob) {
            downloadBlob(blob, `${filename}.png`);
          }
          URL.revokeObjectURL(svgUrl);
        },
        'image/png',
        quality
      );
    };
    img.src = svgUrl;
  } catch (error) {
    console.error('Failed to export PNG:', error);
    throw error;
  }
}

/**
 * Export chart to SVG
 */
export function exportToSVG(
  svgElement: SVGSVGElement,
  options: ExportOptions
): void {
  const { filename = 'chart' } = options;

  try {
    // Clone SVG to avoid modifying original
    const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;

    // Add XML namespace if not present
    if (!clonedSvg.getAttribute('xmlns')) {
      clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }

    // Serialize SVG
    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });

    // Download
    downloadBlob(svgBlob, `${filename}.svg`);
  } catch (error) {
    console.error('Failed to export SVG:', error);
    throw error;
  }
}

/**
 * Export chart data to CSV
 */
export function exportToCSV<T extends ChartDataPoint>(
  data: T[],
  options: ExportOptions
): void {
  const { filename = 'chart-data' } = options;

  try {
    if (!data || data.length === 0) {
      throw new Error('No data to export');
    }

    // Get all unique keys from data
    const keys = Array.from(
      new Set(data.flatMap((item) => Object.keys(item)))
    );

    // Create CSV header
    const header = keys.join(',');

    // Create CSV rows
    const rows = data.map((item) =>
      keys.map((key) => {
        const value = item[key];
        // Escape commas and quotes in values
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',')
    );

    // Combine header and rows
    const csv = [header, ...rows].join('\n');

    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    downloadBlob(blob, `${filename}.csv`);
  } catch (error) {
    console.error('Failed to export CSV:', error);
    throw error;
  }
}

/**
 * Helper function to trigger blob download
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Get SVG element from chart container
 */
export function getSVGElement(containerRef: HTMLElement | null): SVGSVGElement | null {
  if (!containerRef) return null;

  // Find SVG element in container
  const svg = containerRef.querySelector('svg');
  return svg;
}

/**
 * Format data for export with custom transformations
 */
export function formatDataForExport<T extends ChartDataPoint>(
  data: T[],
  transformers?: Record<string, (value: any) => any>
): ChartDataPoint[] {
  if (!transformers) return data;

  return data.map((item) => {
    const formatted: ChartDataPoint = {};
    Object.entries(item).forEach(([key, value]) => {
      formatted[key] = transformers[key] ? transformers[key](value) : value;
    });
    return formatted;
  });
}

/**
 * Copy chart image to clipboard (modern browsers)
 */
export async function copyChartToClipboard(svgElement: SVGSVGElement): Promise<void> {
  try {
    // Check clipboard API support
    if (!navigator.clipboard || !ClipboardItem) {
      throw new Error('Clipboard API not supported');
    }

    // Create canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    // Get SVG dimensions
    const bbox = svgElement.getBBox();
    canvas.width = bbox.width;
    canvas.height = bbox.height;

    // Convert SVG to data URL
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    // Load SVG into image
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = svgUrl;
    });

    // Draw to canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    // Convert to blob and copy
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), 'image/png');
    });

    const item = new ClipboardItem({ 'image/png': blob });
    await navigator.clipboard.write([item]);

    URL.revokeObjectURL(svgUrl);
  } catch (error) {
    console.error('Failed to copy chart to clipboard:', error);
    throw error;
  }
}

/**
 * Print chart
 */
export function printChart(containerRef: HTMLElement | null): void {
  if (!containerRef) return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    console.error('Failed to open print window');
    return;
  }

  // Get chart HTML
  const chartHTML = containerRef.innerHTML;

  // Create print document
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Chart</title>
        <style>
          body {
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        ${chartHTML}
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();

  // Wait for content to load, then print
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
}
