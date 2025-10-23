/**
 * Unit tests for AgentCard component
 * Tests agent display, status badges, and control actions
 */

import { render, screen, fireEvent } from '@testing-library/react';

import { mockAgent, mockAgents } from '../../../tests/fixtures/telemetryData';
import { AgentCard } from '../AgentCard';

describe('AgentCard Component', () => {
  describe('Basic rendering', () => {
    it('should render agent information', () => {
      render(<AgentCard agent={mockAgent} />);

      expect(screen.getByText(mockAgent.name)).toBeInTheDocument();
      expect(screen.getByText(mockAgent.type)).toBeInTheDocument();
      expect(screen.getByText(mockAgent.status)).toBeInTheDocument();
    });

    it('should display agent metrics', () => {
      render(<AgentCard agent={mockAgent} />);

      expect(screen.getByText(mockAgent.taskCount.toString())).toBeInTheDocument();
      expect(screen.getByText(`${mockAgent.avgResponseTime}ms`)).toBeInTheDocument();
      expect(screen.getByText(`${mockAgent.cpu}%`)).toBeInTheDocument();
      expect(screen.getByText(`${mockAgent.memory}%`)).toBeInTheDocument();
    });

    it('should show last active time', () => {
      render(<AgentCard agent={mockAgent} />);

      const activeText = screen.getByText(/Active/i);
      expect(activeText).toBeInTheDocument();
    });
  });

  describe('Status badges', () => {
    it('should display running status', () => {
      const runningAgent = { ...mockAgent, status: 'running' as const };
      render(<AgentCard agent={runningAgent} />);

      expect(screen.getByText('running')).toBeInTheDocument();
      expect(screen.getByText('▶')).toBeInTheDocument();
    });

    it('should display idle status', () => {
      const idleAgent = mockAgents[1];
      render(<AgentCard agent={idleAgent} />);

      expect(screen.getByText('idle')).toBeInTheDocument();
      expect(screen.getByText('⏸')).toBeInTheDocument();
    });

    it('should display paused status', () => {
      const pausedAgent = mockAgents[2];
      render(<AgentCard agent={pausedAgent} />);

      expect(screen.getByText('paused')).toBeInTheDocument();
      expect(screen.getByText('⏸')).toBeInTheDocument();
    });

    it('should display error status', () => {
      const errorAgent = { ...mockAgent, status: 'error' as const };
      render(<AgentCard agent={errorAgent} />);

      expect(screen.getByText('error')).toBeInTheDocument();
      expect(screen.getByText('✖')).toBeInTheDocument();
    });
  });

  describe('Control buttons', () => {
    it('should show pause button for running agent', () => {
      const runningAgent = { ...mockAgent, status: 'running' as const };
      const onPause = jest.fn();

      render(<AgentCard agent={runningAgent} onPause={onPause} />);

      const pauseButton = screen.getByText('Pause');
      expect(pauseButton).toBeInTheDocument();
    });

    it('should call onPause when pause button clicked', () => {
      const runningAgent = { ...mockAgent, status: 'running' as const };
      const onPause = jest.fn();

      render(<AgentCard agent={runningAgent} onPause={onPause} />);

      const pauseButton = screen.getByText('Pause');
      fireEvent.click(pauseButton);

      expect(onPause).toHaveBeenCalledWith(mockAgent.id);
      expect(onPause).toHaveBeenCalledTimes(1);
    });

    it('should show resume button for paused agent', () => {
      const pausedAgent = { ...mockAgent, status: 'paused' as const };
      const onResume = jest.fn();

      render(<AgentCard agent={pausedAgent} onResume={onResume} />);

      const resumeButton = screen.getByText('Resume');
      expect(resumeButton).toBeInTheDocument();
    });

    it('should call onResume when resume button clicked', () => {
      const pausedAgent = { ...mockAgent, status: 'paused' as const };
      const onResume = jest.fn();

      render(<AgentCard agent={pausedAgent} onResume={onResume} />);

      const resumeButton = screen.getByText('Resume');
      fireEvent.click(resumeButton);

      expect(onResume).toHaveBeenCalledWith(mockAgent.id);
      expect(onResume).toHaveBeenCalledTimes(1);
    });

    it('should not show buttons when handlers not provided', () => {
      const runningAgent = { ...mockAgent, status: 'running' as const };
      render(<AgentCard agent={runningAgent} />);

      expect(screen.queryByText('Pause')).not.toBeInTheDocument();
    });

    it('should not show pause for idle agent', () => {
      const idleAgent = { ...mockAgent, status: 'idle' as const };
      const onPause = jest.fn();

      render(<AgentCard agent={idleAgent} onPause={onPause} />);

      expect(screen.queryByText('Pause')).not.toBeInTheDocument();
    });
  });

  describe('Metrics display', () => {
    it('should display all metric labels', () => {
      render(<AgentCard agent={mockAgent} />);

      expect(screen.getByText('Tasks')).toBeInTheDocument();
      expect(screen.getByText('Avg Time')).toBeInTheDocument();
      expect(screen.getByText('CPU')).toBeInTheDocument();
      expect(screen.getByText('Memory')).toBeInTheDocument();
    });

    it('should format metrics correctly', () => {
      const agent = {
        ...mockAgent,
        taskCount: 0,
        avgResponseTime: 1000,
        cpu: 100,
        memory: 50,
      };

      render(<AgentCard agent={agent} />);

      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('1000ms')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });
  });

  describe('Hover effects', () => {
    it('should have hover transition class', () => {
      const { container } = render(<AgentCard agent={mockAgent} />);

      const card = container.firstChild;
      expect(card).toHaveClass('hover:border-brand-accent/50');
      expect(card).toHaveClass('transition-colors');
    });
  });

  describe('Edge cases', () => {
    it('should handle very long agent names', () => {
      const longNameAgent = {
        ...mockAgent,
        name: 'very-long-agent-name-that-might-overflow-the-card-layout',
      };

      render(<AgentCard agent={longNameAgent} />);

      expect(screen.getByText(longNameAgent.name)).toBeInTheDocument();
    });

    it('should handle zero task count', () => {
      const noTaskAgent = { ...mockAgent, taskCount: 0 };
      render(<AgentCard agent={noTaskAgent} />);

      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should handle very high response times', () => {
      const slowAgent = { ...mockAgent, avgResponseTime: 9999 };
      render(<AgentCard agent={slowAgent} />);

      expect(screen.getByText('9999ms')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper button roles', () => {
      const runningAgent = { ...mockAgent, status: 'running' as const };
      const onPause = jest.fn();

      render(<AgentCard agent={runningAgent} onPause={onPause} />);

      const button = screen.getByText('Pause');
      expect(button.tagName).toBe('BUTTON');
    });

    it('should have semantic heading for agent name', () => {
      render(<AgentCard agent={mockAgent} />);

      const heading = screen.getByText(mockAgent.name);
      expect(heading.tagName).toBe('H4');
    });
  });
});
