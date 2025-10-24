/**
 * Analytics Store
 *
 * Zustand store for managing data analytics state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AnalyticsState,
  FilterPreset,
  ColumnConfig,
  ColumnPreset,
} from '../types/analytics';

export const useAnalyticsStore = create<AnalyticsState>()(
  persist(
    (set, get) => ({
      // Initial state
      filters: [],
      filterPresets: [],
      activePresetId: null,
      groupBy: null,
      columnConfigs: [],
      columnPresets: [],
      activeColumnPresetId: null,
      selectedRows: new Set<string>(),
      sortBy: [],

      // Filter actions
      addFilter: (filter) => {
        set((state) => ({
          filters: [...state.filters, filter],
        }));
      },

      updateFilter: (id, updates) => {
        set((state) => ({
          filters: state.filters.map((f) =>
            f.id === id ? { ...f, ...updates } : f
          ),
        }));
      },

      removeFilter: (id) => {
        set((state) => ({
          filters: state.filters.filter((f) => f.id !== id),
        }));
      },

      clearFilters: () => {
        set({ filters: [] });
      },

      saveFilterPreset: (name) => {
        const { filters } = get();
        const preset: FilterPreset = {
          id: `preset-${Date.now()}`,
          name,
          filters: [...filters],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set((state) => ({
          filterPresets: [...state.filterPresets, preset],
          activePresetId: preset.id,
        }));
      },

      loadFilterPreset: (id) => {
        const { filterPresets } = get();
        const preset = filterPresets.find((p) => p.id === id);

        if (preset) {
          set({
            filters: [...preset.filters],
            activePresetId: id,
          });
        }
      },

      deleteFilterPreset: (id) => {
        set((state) => ({
          filterPresets: state.filterPresets.filter((p) => p.id !== id),
          activePresetId: state.activePresetId === id ? null : state.activePresetId,
        }));
      },

      // Grouping actions
      setGroupBy: (config) => {
        set({ groupBy: config });
      },

      // Column actions
      updateColumnConfig: (id, updates) => {
        set((state) => ({
          columnConfigs: state.columnConfigs.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        }));
      },

      reorderColumns: (columnIds) => {
        set((state) => {
          const columnsMap = new Map(state.columnConfigs.map((c) => [c.id, c]));
          const reordered = columnIds
            .map((id) => columnsMap.get(id))
            .filter(Boolean) as ColumnConfig[];

          return { columnConfigs: reordered };
        });
      },

      saveColumnPreset: (name) => {
        const { columnConfigs } = get();
        const preset: ColumnPreset = {
          id: `col-preset-${Date.now()}`,
          name,
          columns: [...columnConfigs],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set((state) => ({
          columnPresets: [...state.columnPresets, preset],
          activeColumnPresetId: preset.id,
        }));
      },

      loadColumnPreset: (id) => {
        const { columnPresets } = get();
        const preset = columnPresets.find((p) => p.id === id);

        if (preset) {
          set({
            columnConfigs: [...preset.columns],
            activeColumnPresetId: id,
          });
        }
      },

      deleteColumnPreset: (id) => {
        set((state) => ({
          columnPresets: state.columnPresets.filter((p) => p.id !== id),
          activeColumnPresetId: state.activeColumnPresetId === id ? null : state.activeColumnPresetId,
        }));
      },

      // Row selection actions
      toggleRowSelection: (rowId) => {
        set((state) => {
          const newSelection = new Set(state.selectedRows);
          if (newSelection.has(rowId)) {
            newSelection.delete(rowId);
          } else {
            newSelection.add(rowId);
          }
          return { selectedRows: newSelection };
        });
      },

      selectAllRows: (rowIds) => {
        set({ selectedRows: new Set(rowIds) });
      },

      clearRowSelection: () => {
        set({ selectedRows: new Set() });
      },

      // Sorting actions
      setSortBy: (sortBy) => {
        set({ sortBy });
      },
    }),
    {
      name: 'analytics-storage',
      partialize: (state) => ({
        filterPresets: state.filterPresets,
        columnPresets: state.columnPresets,
      }),
    }
  )
);
