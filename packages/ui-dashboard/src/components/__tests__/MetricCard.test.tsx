/**
 * Unit tests for MetricCard component
 * Tests rendering, props, and animations
 */

import { render, screen } from '@testing-library/react';

import { MetricCard } from '../MetricCard';

describe('MetricCard Component', () => {
  describe('Basic rendering', () => {
    it('should render title and value', () => {
      render(<MetricCard title="Active Agents" value="8/12" />);

      expect(screen.getByText('Active Agents')).toBeInTheDocument();
      expect(screen.getByText('8/12')).toBeInTheDocument();
    });

    it('should render subtitle when provided', () => {
      render(<MetricCard title="Tasks Completed" value="432" subtitle="4 failed" />);

      expect(screen.getByText('4 failed')).toBeInTheDocument();
    });

    it('should render without subtitle', () => {
      const { container } = render(<MetricCard title="Throughput" value="18.5" />);

      expect(container.textContent).not.toContain('undefined');
    });
  });

  describe('Trend indicator', () => {
    it('should display positive trend', () => {
      render(
        <MetricCard title="Performance" value="95%" trend={{ value: 12, isPositive: true }} />
      );

      const trendElement = screen.getByText('12%');
      expect(trendElement).toBeInTheDocument();
      expect(trendElement).toHaveClass('text-brand-success');
      expect(screen.getByText('↑')).toBeInTheDocument();
    });

    it('should display negative trend', () => {
      render(
        <MetricCard title="Response Time" value="250ms" trend={{ value: 8, isPositive: false }} />
      );

      const trendElement = screen.getByText('8%');
      expect(trendElement).toHaveClass('text-brand-danger');
      expect(screen.getByText('↓')).toBeInTheDocument();
    });

    it('should handle zero trend', () => {
      render(
        <MetricCard title="Stable Metric" value="100" trend={{ value: 0, isPositive: true }} />
      );

      expect(screen.getByText('0%')).toBeInTheDocument();
    });
  });

  describe('Status styling', () => {
    it('should apply success status class', () => {
      const { container } = render(<MetricCard title="Test" value="100" status="success" />);

      const card = container.firstChild;
      expect(card).toHaveClass('border-brand-success/30');
      expect(card).toHaveClass('bg-brand-success/5');
    });

    it('should apply warning status class', () => {
      const { container } = render(<MetricCard title="Test" value="50" status="warning" />);

      const card = container.firstChild;
      expect(card).toHaveClass('border-brand-warning/30');
      expect(card).toHaveClass('bg-brand-warning/5');
    });

    it('should apply danger status class', () => {
      const { container } = render(<MetricCard title="Test" value="10" status="danger" />);

      const card = container.firstChild;
      expect(card).toHaveClass('border-brand-danger/30');
    });

    it('should apply info status class', () => {
      const { container } = render(<MetricCard title="Test" value="Data" status="info" />);

      const card = container.firstChild;
      expect(card).toHaveClass('border-brand-info/30');
    });

    it('should render without status styling', () => {
      const { container } = render(<MetricCard title="Test" value="Neutral" />);

      const card = container.firstChild;
      expect(card).not.toHaveClass('border-brand-success/30');
      expect(card).not.toHaveClass('border-brand-warning/30');
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <MetricCard title="Test" value="123" className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should merge with existing classes', () => {
      const { container } = render(
        <MetricCard title="Test" value="123" className="custom-class" status="success" />
      );

      const card = container.firstChild;
      expect(card).toHaveClass('custom-class');
      expect(card).toHaveClass('border-brand-success/30');
    });
  });

  describe('Icon rendering', () => {
    it('should render icon when provided', () => {
      const icon = <span data-testid="test-icon">📊</span>;
      render(<MetricCard title="Test" value="100" icon={icon} />);

      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    });

    it('should render without icon', () => {
      const { container } = render(<MetricCard title="Test" value="100" />);

      expect(container.querySelector('[data-testid="test-icon"]')).not.toBeInTheDocument();
    });
  });

  describe('Value types', () => {
    it('should render string values', () => {
      render(<MetricCard title="Test" value="Running" />);
      expect(screen.getByText('Running')).toBeInTheDocument();
    });

    it('should render numeric values', () => {
      render(<MetricCard title="Test" value={42} />);
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('should render zero value', () => {
      render(<MetricCard title="Test" value={0} />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<MetricCard title="Important Metric" value="100" />);

      const heading = screen.getByText('Important Metric');
      expect(heading.tagName).toBe('H3');
    });

    it('should render semantic HTML structure', () => {
      const { container } = render(<MetricCard title="Test" value="100" subtitle="Info" />);

      expect(container.querySelector('h3')).toBeInTheDocument();
      expect(container.querySelector('p')).toBeInTheDocument();
    });
  });
});
