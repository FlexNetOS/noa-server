import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatHistoryStore } from '@/stores/chatHistory';
import { useFileBrowserStore } from '@/stores/fileBrowser';
import { useDashboardLayoutStore } from '@/stores/dashboardLayout';
import { useAnalyticsStore } from '@/stores/analyticsStore';

/**
 * Zustand Stores Unit Tests
 * Tests all Zustand stores with state management and persistence.
 */

describe('Zustand Stores', () => {
  describe('Chat History Store', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useChatHistoryStore());
      act(() => {
        result.current.clearAll();
      });
    });

    it('should initialize with empty state', () => {
      const { result } = renderHook(() => useChatHistoryStore());

      expect(result.current.conversations).toEqual([]);
      expect(result.current.currentConversationId).toBeNull();
    });

    it('should create a conversation', () => {
      const { result } = renderHook(() => useChatHistoryStore());

      act(() => {
        result.current.createConversation('Test Chat');
      });

      expect(result.current.conversations).toHaveLength(1);
      expect(result.current.conversations[0].title).toBe('Test Chat');
    });

    it('should set current conversation', () => {
      const { result } = renderHook(() => useChatHistoryStore());

      act(() => {
        result.current.createConversation('Test');
      });

      const conversationId = result.current.conversations[0].id;

      act(() => {
        result.current.setCurrentConversation(conversationId);
      });

      expect(result.current.currentConversationId).toBe(conversationId);
    });

    it('should add messages', () => {
      const { result } = renderHook(() => useChatHistoryStore());

      act(() => {
        result.current.createConversation('Test');
      });

      const conversationId = result.current.conversations[0].id;

      act(() => {
        result.current.addMessage(conversationId, {
          role: 'user',
          content: 'Hello',
          timestamp: Date.now(),
        });
      });

      const conversation = result.current.conversations[0];
      expect(conversation.messages).toHaveLength(1);
      expect(conversation.messages[0].content).toBe('Hello');
    });

    it('should delete conversation', () => {
      const { result } = renderHook(() => useChatHistoryStore());

      act(() => {
        result.current.createConversation('Test');
      });

      const conversationId = result.current.conversations[0].id;

      act(() => {
        result.current.deleteConversation(conversationId);
      });

      expect(result.current.conversations).toHaveLength(0);
    });

    it('should search conversations', () => {
      const { result } = renderHook(() => useChatHistoryStore());

      act(() => {
        result.current.createConversation('Important Chat');
        result.current.createConversation('Random Chat');
      });

      const results = result.current.searchConversations('Important');

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Important Chat');
    });
  });

  describe('File Browser Store', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useFileBrowserStore());
      act(() => {
        result.current.clearFiles();
      });
    });

    it('should initialize with empty files', () => {
      const { result } = renderHook(() => useFileBrowserStore());

      expect(result.current.files).toEqual([]);
      expect(result.current.selectedFiles).toEqual([]);
    });

    it('should add files', () => {
      const { result } = renderHook(() => useFileBrowserStore());

      const files = [
        { id: '1', name: 'file1.txt', size: 100, type: 'text/plain' },
        { id: '2', name: 'file2.txt', size: 200, type: 'text/plain' },
      ];

      act(() => {
        result.current.addFiles(files as any);
      });

      expect(result.current.files).toHaveLength(2);
    });

    it('should remove file', () => {
      const { result } = renderHook(() => useFileBrowserStore());

      act(() => {
        result.current.addFiles([
          { id: '1', name: 'test.txt', size: 100, type: 'text/plain' } as any,
        ]);
      });

      act(() => {
        result.current.removeFile('1');
      });

      expect(result.current.files).toHaveLength(0);
    });

    it('should select files', () => {
      const { result } = renderHook(() => useFileBrowserStore());

      act(() => {
        result.current.addFiles([
          { id: '1', name: 'file1.txt', size: 100, type: 'text/plain' } as any,
          { id: '2', name: 'file2.txt', size: 200, type: 'text/plain' } as any,
        ]);
      });

      act(() => {
        result.current.selectFile('1');
        result.current.selectFile('2');
      });

      expect(result.current.selectedFiles).toEqual(['1', '2']);
    });

    it('should filter files', () => {
      const { result } = renderHook(() => useFileBrowserStore());

      act(() => {
        result.current.addFiles([
          { id: '1', name: 'image.png', size: 100, type: 'image/png' } as any,
          { id: '2', name: 'doc.pdf', size: 200, type: 'application/pdf' } as any,
        ]);
      });

      act(() => {
        result.current.setFilter({ type: 'image/png' });
      });

      expect(result.current.filteredFiles).toHaveLength(1);
      expect(result.current.filteredFiles[0].type).toBe('image/png');
    });

    it('should sort files', () => {
      const { result } = renderHook(() => useFileBrowserStore());

      act(() => {
        result.current.addFiles([
          { id: '1', name: 'zzz.txt', size: 100, type: 'text/plain' } as any,
          { id: '2', name: 'aaa.txt', size: 200, type: 'text/plain' } as any,
        ]);
      });

      act(() => {
        result.current.setSortBy('name');
      });

      expect(result.current.sortedFiles[0].name).toBe('aaa.txt');
    });
  });

  describe('Dashboard Layout Store', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useDashboardLayoutStore());
      act(() => {
        result.current.resetLayout();
      });
    });

    it('should initialize with default layout', () => {
      const { result } = renderHook(() => useDashboardLayoutStore());

      expect(result.current.widgets).toBeDefined();
      expect(Array.isArray(result.current.widgets)).toBe(true);
    });

    it('should add widget', () => {
      const { result } = renderHook(() => useDashboardLayoutStore());

      act(() => {
        result.current.addWidget({
          id: 'widget-1',
          type: 'metric',
          title: 'Test Widget',
          x: 0,
          y: 0,
          w: 2,
          h: 2,
        } as any);
      });

      expect(result.current.widgets).toHaveLength(1);
      expect(result.current.widgets[0].title).toBe('Test Widget');
    });

    it('should remove widget', () => {
      const { result } = renderHook(() => useDashboardLayoutStore());

      act(() => {
        result.current.addWidget({
          id: 'widget-1',
          type: 'metric',
          title: 'Test',
          x: 0,
          y: 0,
          w: 2,
          h: 2,
        } as any);
      });

      act(() => {
        result.current.removeWidget('widget-1');
      });

      expect(result.current.widgets).toHaveLength(0);
    });

    it('should update widget position', () => {
      const { result } = renderHook(() => useDashboardLayoutStore());

      act(() => {
        result.current.addWidget({
          id: 'widget-1',
          type: 'metric',
          title: 'Test',
          x: 0,
          y: 0,
          w: 2,
          h: 2,
        } as any);
      });

      act(() => {
        result.current.updateWidgetPosition('widget-1', { x: 2, y: 2 });
      });

      expect(result.current.widgets[0].x).toBe(2);
      expect(result.current.widgets[0].y).toBe(2);
    });

    it('should save layout to localStorage', () => {
      const { result } = renderHook(() => useDashboardLayoutStore());

      act(() => {
        result.current.addWidget({
          id: 'widget-1',
          type: 'metric',
          title: 'Test',
          x: 0,
          y: 0,
          w: 2,
          h: 2,
        } as any);
      });

      act(() => {
        result.current.saveLayout();
      });

      // Verify saved to localStorage
      const saved = localStorage.getItem('dashboard-layout');
      expect(saved).toBeTruthy();
    });
  });

  describe('Analytics Store', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useAnalyticsStore());
      act(() => {
        result.current.clearData();
      });
    });

    it('should initialize with empty data', () => {
      const { result } = renderHook(() => useAnalyticsStore());

      expect(result.current.data).toEqual([]);
      expect(result.current.metrics).toBeDefined();
    });

    it('should set data', () => {
      const { result } = renderHook(() => useAnalyticsStore());

      const data = [
        { date: '2024-01-01', value: 100 },
        { date: '2024-01-02', value: 150 },
      ];

      act(() => {
        result.current.setData(data);
      });

      expect(result.current.data).toEqual(data);
    });

    it('should calculate metrics', () => {
      const { result } = renderHook(() => useAnalyticsStore());

      const data = [{ value: 10 }, { value: 20 }, { value: 30 }];

      act(() => {
        result.current.setData(data);
      });

      act(() => {
        result.current.calculateMetrics();
      });

      expect(result.current.metrics.total).toBe(60);
      expect(result.current.metrics.average).toBe(20);
    });

    it('should apply date range filter', () => {
      const { result } = renderHook(() => useAnalyticsStore());

      const data = [
        { date: '2024-01-01', value: 100 },
        { date: '2024-01-15', value: 150 },
        { date: '2024-02-01', value: 200 },
      ];

      act(() => {
        result.current.setData(data);
        result.current.setDateRange({
          start: '2024-01-01',
          end: '2024-01-31',
        });
      });

      expect(result.current.filteredData).toHaveLength(2);
    });

    it('should export analytics data', () => {
      const { result } = renderHook(() => useAnalyticsStore());

      const data = [{ metric: 'users', value: 100 }];

      act(() => {
        result.current.setData(data);
      });

      const exported = result.current.exportData('csv');

      expect(exported).toBeTruthy();
    });
  });
});
