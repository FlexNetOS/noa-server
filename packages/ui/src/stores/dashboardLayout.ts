/**
 * Dashboard Layout Store - Zustand State Management
 *
 * Handles dashboard layout persistence and state management
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DashboardLayout, DashboardState, Widget, WidgetSettings, LayoutBreakpoint } from '../types/dashboard';

interface DashboardStore extends DashboardState {
  // Layout Management
  setCurrentLayout: (layout: DashboardLayout) => void;
  createLayout: (name: string, description?: string) => DashboardLayout;
  updateLayout: (id: string, updates: Partial<DashboardLayout>) => void;
  deleteLayout: (id: string) => void;
  duplicateLayout: (id: string, newName: string) => void;

  // Widget Management
  addWidget: (widget: Omit<Widget, 'id'>) => void;
  updateWidget: (id: string, updates: Partial<Widget>) => void;
  removeWidget: (id: string) => void;
  updateWidgetPosition: (id: string, position: Pick<Widget, 'x' | 'y' | 'w' | 'h'>) => void;
  updateWidgetSettings: (id: string, settings: Partial<WidgetSettings>) => void;

  // Layout State
  setEditing: (isEditing: boolean) => void;
  setLocked: (isLocked: boolean) => void;
  setBreakpoint: (breakpoint: keyof LayoutBreakpoint) => void;

  // Import/Export
  exportLayout: (id: string) => string;
  importLayout: (json: string) => void;

  // Utilities
  resetToDefault: () => void;
  clearAllLayouts: () => void;
}

const generateId = () => `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const createDefaultLayout = (): DashboardLayout => ({
  id: `layout-${Date.now()}`,
  name: 'Default Dashboard',
  description: 'Default dashboard layout',
  widgets: [
    {
      id: generateId(),
      type: 'metric-card',
      x: 0,
      y: 0,
      w: 3,
      h: 2,
      settings: {
        title: 'Total Requests',
        refreshInterval: 5000,
      },
    },
    {
      id: generateId(),
      type: 'line-chart',
      x: 3,
      y: 0,
      w: 6,
      h: 4,
      settings: {
        title: 'Request Rate',
        refreshInterval: 10000,
      },
    },
    {
      id: generateId(),
      type: 'status',
      x: 9,
      y: 0,
      w: 3,
      h: 2,
      settings: {
        title: 'System Health',
        refreshInterval: 15000,
      },
    },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isDefault: true,
});

export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set, get) => ({
      // Initial State
      currentLayout: createDefaultLayout(),
      savedLayouts: [createDefaultLayout()],
      isEditing: false,
      isLocked: false,
      breakpoint: 'lg',

      // Layout Management
      setCurrentLayout: (layout) => {
        set({ currentLayout: layout });
      },

      createLayout: (name, description) => {
        const newLayout: DashboardLayout = {
          id: `layout-${Date.now()}`,
          name,
          description,
          widgets: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set((state) => ({
          savedLayouts: [...state.savedLayouts, newLayout],
          currentLayout: newLayout,
        }));

        return newLayout;
      },

      updateLayout: (id, updates) => {
        set((state) => {
          const updatedLayouts = state.savedLayouts.map((layout) =>
            layout.id === id
              ? { ...layout, ...updates, updatedAt: new Date().toISOString() }
              : layout
          );

          const updatedCurrent =
            state.currentLayout?.id === id
              ? { ...state.currentLayout, ...updates, updatedAt: new Date().toISOString() }
              : state.currentLayout;

          return {
            savedLayouts: updatedLayouts,
            currentLayout: updatedCurrent,
          };
        });
      },

      deleteLayout: (id) => {
        set((state) => {
          const filteredLayouts = state.savedLayouts.filter((layout) => layout.id !== id);
          const newCurrent =
            state.currentLayout?.id === id
              ? filteredLayouts[0] || createDefaultLayout()
              : state.currentLayout;

          return {
            savedLayouts: filteredLayouts.length > 0 ? filteredLayouts : [createDefaultLayout()],
            currentLayout: newCurrent,
          };
        });
      },

      duplicateLayout: (id, newName) => {
        set((state) => {
          const layoutToDuplicate = state.savedLayouts.find((layout) => layout.id === id);
          if (!layoutToDuplicate) return state;

          const duplicatedLayout: DashboardLayout = {
            ...layoutToDuplicate,
            id: `layout-${Date.now()}`,
            name: newName,
            widgets: layoutToDuplicate.widgets.map((widget) => ({
              ...widget,
              id: generateId(),
            })),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isDefault: false,
          };

          return {
            savedLayouts: [...state.savedLayouts, duplicatedLayout],
          };
        });
      },

      // Widget Management
      addWidget: (widget) => {
        const newWidget: Widget = {
          ...widget,
          id: generateId(),
        };

        set((state) => {
          if (!state.currentLayout) return state;

          const updatedLayout = {
            ...state.currentLayout,
            widgets: [...state.currentLayout.widgets, newWidget],
            updatedAt: new Date().toISOString(),
          };

          return {
            currentLayout: updatedLayout,
            savedLayouts: state.savedLayouts.map((layout) =>
              layout.id === updatedLayout.id ? updatedLayout : layout
            ),
          };
        });
      },

      updateWidget: (id, updates) => {
        set((state) => {
          if (!state.currentLayout) return state;

          const updatedLayout = {
            ...state.currentLayout,
            widgets: state.currentLayout.widgets.map((widget) =>
              widget.id === id ? { ...widget, ...updates } : widget
            ),
            updatedAt: new Date().toISOString(),
          };

          return {
            currentLayout: updatedLayout,
            savedLayouts: state.savedLayouts.map((layout) =>
              layout.id === updatedLayout.id ? updatedLayout : layout
            ),
          };
        });
      },

      removeWidget: (id) => {
        set((state) => {
          if (!state.currentLayout) return state;

          const updatedLayout = {
            ...state.currentLayout,
            widgets: state.currentLayout.widgets.filter((widget) => widget.id !== id),
            updatedAt: new Date().toISOString(),
          };

          return {
            currentLayout: updatedLayout,
            savedLayouts: state.savedLayouts.map((layout) =>
              layout.id === updatedLayout.id ? updatedLayout : layout
            ),
          };
        });
      },

      updateWidgetPosition: (id, position) => {
        get().updateWidget(id, position);
      },

      updateWidgetSettings: (id, settings) => {
        set((state) => {
          if (!state.currentLayout) return state;

          const updatedLayout = {
            ...state.currentLayout,
            widgets: state.currentLayout.widgets.map((widget) =>
              widget.id === id
                ? { ...widget, settings: { ...widget.settings, ...settings } }
                : widget
            ),
            updatedAt: new Date().toISOString(),
          };

          return {
            currentLayout: updatedLayout,
            savedLayouts: state.savedLayouts.map((layout) =>
              layout.id === updatedLayout.id ? updatedLayout : layout
            ),
          };
        });
      },

      // Layout State
      setEditing: (isEditing) => set({ isEditing }),
      setLocked: (isLocked) => set({ isLocked }),
      setBreakpoint: (breakpoint) => set({ breakpoint }),

      // Import/Export
      exportLayout: (id) => {
        const layout = get().savedLayouts.find((l) => l.id === id);
        if (!layout) throw new Error('Layout not found');

        const exportData = {
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
          layout,
          metadata: {
            author: 'Dashboard User',
            tags: ['exported'],
          },
        };

        return JSON.stringify(exportData, null, 2);
      },

      importLayout: (json) => {
        try {
          const importData = JSON.parse(json);
          const importedLayout: DashboardLayout = {
            ...importData.layout,
            id: `layout-${Date.now()}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isDefault: false,
          };

          set((state) => ({
            savedLayouts: [...state.savedLayouts, importedLayout],
            currentLayout: importedLayout,
          }));
        } catch (error) {
          console.error('Failed to import layout:', error);
          throw new Error('Invalid layout JSON');
        }
      },

      // Utilities
      resetToDefault: () => {
        const defaultLayout = createDefaultLayout();
        set({
          currentLayout: defaultLayout,
          savedLayouts: [defaultLayout],
          isEditing: false,
          isLocked: false,
        });
      },

      clearAllLayouts: () => {
        const defaultLayout = createDefaultLayout();
        set({
          currentLayout: defaultLayout,
          savedLayouts: [defaultLayout],
        });
      },
    }),
    {
      name: 'dashboard-storage',
      version: 1,
    }
  )
);
