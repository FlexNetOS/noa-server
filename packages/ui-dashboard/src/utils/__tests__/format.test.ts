/**
 * Unit tests for formatting utilities
 * Tests all formatting functions with edge cases
 */

import {
  formatNumber,
  formatBytes,
  formatDuration,
  formatRelativeTime,
  formatDateTime,
  formatPercentage,
  getStatusColor,
  getStatusBadgeClass,
} from '../format';

describe('Format Utilities', () => {
  describe('formatNumber', () => {
    it('should format numbers less than 1000 as-is', () => {
      expect(formatNumber(0)).toBe('0');
      expect(formatNumber(42)).toBe('42');
      expect(formatNumber(999)).toBe('999');
    });

    it('should format thousands with K suffix', () => {
      expect(formatNumber(1000)).toBe('1.0K');
      expect(formatNumber(1500)).toBe('1.5K');
      expect(formatNumber(999999)).toBe('1000.0K');
    });

    it('should format millions with M suffix', () => {
      expect(formatNumber(1000000)).toBe('1.0M');
      expect(formatNumber(2500000)).toBe('2.5M');
      expect(formatNumber(10000000)).toBe('10.0M');
    });
  });

  describe('formatBytes', () => {
    it('should handle zero bytes', () => {
      expect(formatBytes(0)).toBe('0 B');
    });

    it('should format bytes correctly', () => {
      expect(formatBytes(500)).toBe('500.00 B');
      expect(formatBytes(1024)).toBe('1.00 KB');
      expect(formatBytes(1048576)).toBe('1.00 MB');
      expect(formatBytes(1073741824)).toBe('1.00 GB');
      expect(formatBytes(1099511627776)).toBe('1.00 TB');
    });

    it('should format non-power-of-two values', () => {
      expect(formatBytes(1536)).toBe('1.50 KB');
      expect(formatBytes(2621440)).toBe('2.50 MB');
    });
  });

  describe('formatDuration', () => {
    it('should format milliseconds', () => {
      expect(formatDuration(0)).toBe('0ms');
      expect(formatDuration(500)).toBe('500ms');
      expect(formatDuration(999)).toBe('999ms');
    });

    it('should format seconds', () => {
      expect(formatDuration(1000)).toBe('1.0s');
      expect(formatDuration(5500)).toBe('5.5s');
      expect(formatDuration(59999)).toBe('60.0s');
    });

    it('should format minutes', () => {
      expect(formatDuration(60000)).toBe('1.0m');
      expect(formatDuration(150000)).toBe('2.5m');
      expect(formatDuration(3599999)).toBe('60.0m');
    });

    it('should format hours', () => {
      expect(formatDuration(3600000)).toBe('1.0h');
      expect(formatDuration(7200000)).toBe('2.0h');
      expect(formatDuration(9000000)).toBe('2.5h');
    });
  });

  describe('formatRelativeTime', () => {
    it('should format recent times correctly', () => {
      const now = new Date();
      const result = formatRelativeTime(now);
      expect(result).toContain('ago');
    });

    it('should handle string dates', () => {
      const dateStr = new Date(Date.now() - 60000).toISOString();
      const result = formatRelativeTime(dateStr);
      expect(result).toMatch(/minute|ago/);
    });

    it('should handle Date objects', () => {
      const date = new Date(Date.now() - 3600000);
      const result = formatRelativeTime(date);
      expect(result).toMatch(/hour|ago/);
    });
  });

  describe('formatDateTime', () => {
    it('should format dates in correct pattern', () => {
      const date = new Date('2025-01-15T10:30:45Z');
      const result = formatDateTime(date);
      expect(result).toMatch(/Jan \d{2}, \d{4} \d{2}:\d{2}:\d{2}/);
    });

    it('should handle string dates', () => {
      const dateStr = '2025-01-15T10:30:45Z';
      const result = formatDateTime(dateStr);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });
  });

  describe('formatPercentage', () => {
    it('should format decimal to percentage', () => {
      expect(formatPercentage(0)).toBe('0.0%');
      expect(formatPercentage(0.5)).toBe('50.0%');
      expect(formatPercentage(0.987)).toBe('98.7%');
      expect(formatPercentage(1)).toBe('100.0%');
    });

    it('should handle edge cases', () => {
      expect(formatPercentage(0.001)).toBe('0.1%');
      expect(formatPercentage(0.999)).toBe('99.9%');
    });
  });

  describe('getStatusColor', () => {
    it('should return correct colors for health statuses', () => {
      expect(getStatusColor('healthy')).toBe('text-brand-success');
      expect(getStatusColor('degraded')).toBe('text-brand-warning');
      expect(getStatusColor('unhealthy')).toBe('text-brand-danger');
    });

    it('should return correct colors for agent statuses', () => {
      expect(getStatusColor('running')).toBe('text-brand-success');
      expect(getStatusColor('idle')).toBe('text-brand-muted');
      expect(getStatusColor('error')).toBe('text-brand-danger');
      expect(getStatusColor('paused')).toBe('text-brand-warning');
    });

    it('should return correct colors for task statuses', () => {
      expect(getStatusColor('pending')).toBe('text-brand-info');
      expect(getStatusColor('completed')).toBe('text-brand-success');
      expect(getStatusColor('failed')).toBe('text-brand-danger');
    });

    it('should return default color for unknown status', () => {
      expect(getStatusColor('unknown')).toBe('text-gray-400');
      expect(getStatusColor('')).toBe('text-gray-400');
    });
  });

  describe('getStatusBadgeClass', () => {
    it('should return correct badge classes for all statuses', () => {
      expect(getStatusBadgeClass('healthy')).toContain('green-500');
      expect(getStatusBadgeClass('degraded')).toContain('yellow-500');
      expect(getStatusBadgeClass('unhealthy')).toContain('red-500');
      expect(getStatusBadgeClass('running')).toContain('green-500');
      expect(getStatusBadgeClass('idle')).toContain('gray-500');
      expect(getStatusBadgeClass('error')).toContain('red-500');
      expect(getStatusBadgeClass('paused')).toContain('yellow-500');
    });

    it('should return default badge class for unknown status', () => {
      const result = getStatusBadgeClass('invalid');
      expect(result).toContain('gray-500');
    });

    it('should include opacity and border classes', () => {
      const result = getStatusBadgeClass('running');
      expect(result).toContain('/20');
      expect(result).toContain('border');
    });
  });
});
