import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useChatHistory } from '@/hooks/useChatHistory';
import { useVirtualization } from '@/hooks/useVirtualization';
import { useDashboard } from '@/hooks/useDashboard';
import { useDataAnalytics } from '@/hooks/useDataAnalytics';
import { useChartTheme } from '@/hooks/useChartTheme';
import axios from 'axios';

/**
 * Custom Hooks Unit Tests
 * Tests all custom React hooks with comprehensive coverage.
 */

// Mock axios
vi.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Custom Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useFileUpload', () => {
    it('should initialize with empty files', () => {
      const { result } = renderHook(() => useFileUpload());

      expect(result.current.files).toEqual([]);
      expect(result.current.isUploading).toBe(false);
      expect(result.current.totalProgress).toBe(0);
    });

    it('should add files to the list', async () => {
      const { result } = renderHook(() => useFileUpload());

      const files = [
        new File(['content 1'], 'file1.txt', { type: 'text/plain' }),
        new File(['content 2'], 'file2.txt', { type: 'text/plain' }),
      ];

      await act(async () => {
        await result.current.addFiles(files);
      });

      expect(result.current.files).toHaveLength(2);
      expect(result.current.files[0].name).toBe('file1.txt');
      expect(result.current.files[1].name).toBe('file2.txt');
    });

    it('should remove a file', async () => {
      const { result } = renderHook(() => useFileUpload());

      const files = [new File(['content'], 'test.txt', { type: 'text/plain' })];

      await act(async () => {
        await result.current.addFiles(files);
      });

      const fileId = result.current.files[0].id;

      act(() => {
        result.current.removeFile(fileId);
      });

      expect(result.current.files).toHaveLength(0);
    });

    it('should upload a file successfully', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { id: '123', url: 'https://example.com/file.txt' },
      });

      const { result } = renderHook(() =>
        useFileUpload({ uploadUrl: '/api/upload' })
      );

      const files = [new File(['content'], 'test.txt', { type: 'text/plain' })];

      await act(async () => {
        await result.current.addFiles(files);
      });

      const fileId = result.current.files[0].id;

      await act(async () => {
        await result.current.uploadFile(fileId);
      });

      await waitFor(() => {
        expect(result.current.files[0].status).toBe('success');
      });
    });

    it('should handle upload errors', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Upload failed'));

      const { result } = renderHook(() =>
        useFileUpload({ uploadUrl: '/api/upload' })
      );

      const files = [new File(['content'], 'test.txt', { type: 'text/plain' })];

      await act(async () => {
        await result.current.addFiles(files);
      });

      const fileId = result.current.files[0].id;

      await act(async () => {
        await result.current.uploadFile(fileId);
      });

      await waitFor(() => {
        expect(result.current.files[0].status).toBe('error');
        expect(result.current.files[0].error).toBeTruthy();
      });
    });

    it('should cancel upload', async () => {
      const { result } = renderHook(() =>
        useFileUpload({ uploadUrl: '/api/upload' })
      );

      const files = [new File(['content'], 'test.txt', { type: 'text/plain' })];

      await act(async () => {
        await result.current.addFiles(files);
      });

      const fileId = result.current.files[0].id;

      act(() => {
        result.current.cancelUpload(fileId);
      });

      await waitFor(() => {
        expect(result.current.files[0].status).toBe('cancelled');
      });
    });

    it('should clear all files', async () => {
      const { result } = renderHook(() => useFileUpload());

      const files = [
        new File(['1'], 'file1.txt', { type: 'text/plain' }),
        new File(['2'], 'file2.txt', { type: 'text/plain' }),
      ];

      await act(async () => {
        await result.current.addFiles(files);
      });

      expect(result.current.files).toHaveLength(2);

      act(() => {
        result.current.clearAll();
      });

      expect(result.current.files).toHaveLength(0);
    });
  });

  describe('useChatHistory', () => {
    it('should create a new conversation', async () => {
      const { result } = renderHook(() => useChatHistory());

      let conversationId: string | undefined;

      await act(async () => {
        conversationId = await result.current.createConversation('Test Chat');
      });

      expect(conversationId).toBeTruthy();
    });

    it('should add messages to conversation', async () => {
      const { result } = renderHook(() => useChatHistory());

      let conversationId: string | undefined;

      await act(async () => {
        conversationId = await result.current.createConversation('Test');
      });

      await act(async () => {
        if (conversationId) {
          await result.current.addMessage(conversationId, 'user', 'Hello');
          await result.current.addMessage(conversationId, 'assistant', 'Hi there');
        }
      });

      const messages = await result.current.getMessages(conversationId!);

      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('user');
      expect(messages[1].role).toBe('assistant');
    });

    it('should search messages', async () => {
      const { result } = renderHook(() => useChatHistory());

      let conversationId: string | undefined;

      await act(async () => {
        conversationId = await result.current.createConversation('Test');
      });

      await act(async () => {
        if (conversationId) {
          await result.current.addMessage(conversationId, 'user', 'Hello world');
          await result.current.addMessage(conversationId, 'user', 'Goodbye');
        }
      });

      const searchResults = await result.current.search({ query: 'Hello' });

      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].conversation.id).toBe(conversationId);
    });

    it('should export conversation', async () => {
      const { result } = renderHook(() => useChatHistory());

      let conversationId: string | undefined;

      await act(async () => {
        conversationId = await result.current.createConversation('Test');
        if (conversationId) {
          await result.current.addMessage(conversationId, 'user', 'Test message');
        }
      });

      const exported = await result.current.exportConversation(
        conversationId!,
        'json'
      );

      expect(exported).toBeTruthy();
    });
  });

  describe('useVirtualization', () => {
    it('should virtualize large lists', () => {
      const items = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        content: `Item ${i}`,
      }));

      const { result } = renderHook(() =>
        useVirtualization({
          items,
          itemHeight: 50,
          containerHeight: 500,
        })
      );

      expect(result.current.virtualItems.length).toBeLessThan(items.length);
      expect(result.current.virtualItems.length).toBeGreaterThan(0);
    });

    it('should handle scroll position', () => {
      const items = Array.from({ length: 1000 }, (_, i) => ({ id: i }));

      const { result } = renderHook(() =>
        useVirtualization({
          items,
          itemHeight: 50,
          containerHeight: 500,
        })
      );

      act(() => {
        result.current.scrollToIndex(500);
      });

      expect(result.current.scrollOffset).toBeGreaterThan(0);
    });

    it('should calculate visible range', () => {
      const items = Array.from({ length: 1000 }, (_, i) => ({ id: i }));

      const { result } = renderHook(() =>
        useVirtualization({
          items,
          itemHeight: 50,
          containerHeight: 500,
        })
      );

      const { startIndex, endIndex } = result.current.visibleRange;

      expect(startIndex).toBeGreaterThanOrEqual(0);
      expect(endIndex).toBeLessThanOrEqual(items.length);
      expect(endIndex - startIndex).toBeLessThan(items.length);
    });
  });

  describe('useDashboard', () => {
    it('should manage dashboard layout', () => {
      const { result } = renderHook(() => useDashboard());

      expect(result.current.layout).toBeDefined();
      expect(Array.isArray(result.current.widgets)).toBe(true);
    });

    it('should add widgets', () => {
      const { result } = renderHook(() => useDashboard());

      act(() => {
        result.current.addWidget({
          type: 'metric',
          title: 'Test Widget',
        });
      });

      expect(result.current.widgets.length).toBeGreaterThan(0);
    });

    it('should remove widgets', () => {
      const { result } = renderHook(() => useDashboard());

      act(() => {
        result.current.addWidget({ type: 'metric', title: 'Test' });
      });

      const widgetId = result.current.widgets[0].id;

      act(() => {
        result.current.removeWidget(widgetId);
      });

      expect(result.current.widgets).toHaveLength(0);
    });

    it('should update layout', () => {
      const { result } = renderHook(() => useDashboard());

      const newLayout = [
        { i: 'widget-1', x: 0, y: 0, w: 2, h: 2 },
      ];

      act(() => {
        result.current.updateLayout(newLayout);
      });

      expect(result.current.layout).toEqual(newLayout);
    });

    it('should save and restore layout', async () => {
      const { result } = renderHook(() => useDashboard());

      act(() => {
        result.current.addWidget({ type: 'metric', title: 'Test' });
      });

      await act(async () => {
        await result.current.saveLayout();
      });

      await act(async () => {
        await result.current.restoreLayout();
      });

      expect(result.current.widgets.length).toBeGreaterThan(0);
    });
  });

  describe('useDataAnalytics', () => {
    it('should process analytics data', () => {
      const { result } = renderHook(() => useDataAnalytics());

      const data = [
        { date: '2024-01-01', value: 100 },
        { date: '2024-01-02', value: 150 },
        { date: '2024-01-03', value: 120 },
      ];

      act(() => {
        result.current.setData(data);
      });

      expect(result.current.data).toEqual(data);
    });

    it('should calculate statistics', () => {
      const { result } = renderHook(() => useDataAnalytics());

      const data = [
        { value: 10 },
        { value: 20 },
        { value: 30 },
        { value: 40 },
        { value: 50 },
      ];

      act(() => {
        result.current.setData(data);
      });

      const stats = result.current.getStatistics();

      expect(stats.mean).toBe(30);
      expect(stats.min).toBe(10);
      expect(stats.max).toBe(50);
    });

    it('should filter data', () => {
      const { result } = renderHook(() => useDataAnalytics());

      const data = [
        { category: 'A', value: 10 },
        { category: 'B', value: 20 },
        { category: 'A', value: 30 },
      ];

      act(() => {
        result.current.setData(data);
        result.current.applyFilter({ category: 'A' });
      });

      expect(result.current.filteredData).toHaveLength(2);
    });

    it('should group data', () => {
      const { result } = renderHook(() => useDataAnalytics());

      const data = [
        { category: 'A', value: 10 },
        { category: 'B', value: 20 },
        { category: 'A', value: 30 },
      ];

      act(() => {
        result.current.setData(data);
      });

      const grouped = result.current.groupBy('category');

      expect(Object.keys(grouped)).toHaveLength(2);
      expect(grouped.A).toHaveLength(2);
      expect(grouped.B).toHaveLength(1);
    });
  });

  describe('useChartTheme', () => {
    it('should provide chart theme', () => {
      const { result } = renderHook(() => useChartTheme());

      expect(result.current.theme).toBeDefined();
      expect(result.current.theme.colors).toBeDefined();
    });

    it('should switch between light and dark themes', () => {
      const { result } = renderHook(() => useChartTheme());

      const lightColors = result.current.theme.colors;

      act(() => {
        result.current.setDarkMode(true);
      });

      const darkColors = result.current.theme.colors;

      expect(darkColors).not.toEqual(lightColors);
    });

    it('should customize theme colors', () => {
      const { result } = renderHook(() => useChartTheme());

      const customColors = ['#ff0000', '#00ff00', '#0000ff'];

      act(() => {
        result.current.setCustomColors(customColors);
      });

      expect(result.current.theme.colors).toEqual(customColors);
    });

    it('should reset theme to defaults', () => {
      const { result } = renderHook(() => useChartTheme());

      const defaultTheme = result.current.theme;

      act(() => {
        result.current.setCustomColors(['#ff0000']);
        result.current.resetTheme();
      });

      expect(result.current.theme).toEqual(defaultTheme);
    });
  });
});
