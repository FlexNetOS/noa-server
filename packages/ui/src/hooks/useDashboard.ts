/**
 * Dashboard Hook - Custom React Hook for Dashboard Operations
 *
 * Provides convenient access to dashboard functionality
 */

import { useCallback, useEffect, useState } from 'react';
import { useDashboardStore } from '../stores/dashboardLayout';
import type { Widget, WidgetSettings } from '../types/dashboard';

export interface UseDashboardOptions {
  autoSave?: boolean;
  autoSaveDelay?: number;
}

export function useDashboard(options: UseDashboardOptions = {}) {
  const { autoSave = true, autoSaveDelay = 1000 } = options;

  const {
    currentLayout,
    savedLayouts,
    isEditing,
    isLocked,
    breakpoint,
    setCurrentLayout,
    createLayout,
    updateLayout,
    deleteLayout,
    duplicateLayout,
    addWidget,
    updateWidget,
    removeWidget,
    updateWidgetPosition,
    updateWidgetSettings,
    setEditing,
    setLocked,
    setBreakpoint,
    exportLayout,
    importLayout,
    resetToDefault,
    clearAllLayouts,
  } = useDashboardStore();

  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Auto-save functionality
  const triggerAutoSave = useCallback(() => {
    if (!autoSave || !currentLayout) return;

    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    const timeout = setTimeout(() => {
      console.log('Auto-saving dashboard layout...');
      // The store already handles persistence via zustand/persist
    }, autoSaveDelay);

    setSaveTimeout(timeout);
  }, [autoSave, autoSaveDelay, currentLayout, saveTimeout]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [saveTimeout]);

  // Enhanced widget operations with auto-save
  const handleAddWidget = useCallback(
    (widget: Omit<Widget, 'id'>) => {
      addWidget(widget);
      triggerAutoSave();
    },
    [addWidget, triggerAutoSave]
  );

  const handleUpdateWidget = useCallback(
    (id: string, updates: Partial<Widget>) => {
      updateWidget(id, updates);
      triggerAutoSave();
    },
    [updateWidget, triggerAutoSave]
  );

  const handleRemoveWidget = useCallback(
    (id: string) => {
      removeWidget(id);
      triggerAutoSave();
    },
    [removeWidget, triggerAutoSave]
  );

  const handleUpdateWidgetPosition = useCallback(
    (id: string, position: Pick<Widget, 'x' | 'y' | 'w' | 'h'>) => {
      updateWidgetPosition(id, position);
      triggerAutoSave();
    },
    [updateWidgetPosition, triggerAutoSave]
  );

  const handleUpdateWidgetSettings = useCallback(
    (id: string, settings: Partial<WidgetSettings>) => {
      updateWidgetSettings(id, settings);
      triggerAutoSave();
    },
    [updateWidgetSettings, triggerAutoSave]
  );

  // Layout operations
  const handleSwitchLayout = useCallback(
    (layoutId: string) => {
      const layout = savedLayouts.find((l) => l.id === layoutId);
      if (layout) {
        setCurrentLayout(layout);
      }
    },
    [savedLayouts, setCurrentLayout]
  );

  const handleExport = useCallback(
    async (layoutId?: string) => {
      try {
        const id = layoutId || currentLayout?.id;
        if (!id) throw new Error('No layout to export');

        const json = exportLayout(id);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dashboard-layout-${id}-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        return json;
      } catch (error) {
        console.error('Export failed:', error);
        throw error;
      }
    },
    [currentLayout, exportLayout]
  );

  const handleImport = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        importLayout(text);
      } catch (error) {
        console.error('Import failed:', error);
        throw error;
      }
    },
    [importLayout]
  );

  // Toggle functions
  const toggleEditing = useCallback(() => {
    setEditing(!isEditing);
  }, [isEditing, setEditing]);

  const toggleLocked = useCallback(() => {
    setLocked(!isLocked);
  }, [isLocked, setLocked]);

  // Get widget by ID
  const getWidget = useCallback(
    (id: string): Widget | undefined => {
      return currentLayout?.widgets.find((w) => w.id === id);
    },
    [currentLayout]
  );

  // Get widgets by type
  const getWidgetsByType = useCallback(
    (type: Widget['type']): Widget[] => {
      return currentLayout?.widgets.filter((w) => w.type === type) || [];
    },
    [currentLayout]
  );

  return {
    // State
    currentLayout,
    savedLayouts,
    isEditing,
    isLocked,
    breakpoint,

    // Layout Operations
    createLayout,
    updateLayout,
    deleteLayout,
    duplicateLayout,
    switchLayout: handleSwitchLayout,

    // Widget Operations
    addWidget: handleAddWidget,
    updateWidget: handleUpdateWidget,
    removeWidget: handleRemoveWidget,
    updateWidgetPosition: handleUpdateWidgetPosition,
    updateWidgetSettings: handleUpdateWidgetSettings,
    getWidget,
    getWidgetsByType,

    // State Management
    setEditing,
    setLocked,
    setBreakpoint,
    toggleEditing,
    toggleLocked,

    // Import/Export
    exportLayout: handleExport,
    importLayout: handleImport,

    // Utilities
    resetToDefault,
    clearAllLayouts,
  };
}

// Hook for widget data fetching and refresh
export function useWidgetData<T = any>(
  _widgetId: string,
  fetchFn: () => Promise<T>,
  refreshInterval?: number
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    refresh();

    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(refresh, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refresh, refreshInterval]);

  return { data, isLoading, error, refresh };
}
