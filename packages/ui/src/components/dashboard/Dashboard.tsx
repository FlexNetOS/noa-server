/**
 * Dashboard Component - Main Customizable Dashboard
 *
 * react-grid-layout-based dashboard with drag-and-drop and resize functionality
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboard } from '../../hooks/useDashboard';
import { WidgetContainer } from './Widget';
import { WidgetLibrary } from './WidgetLibrary';
import { DashboardToolbar } from './DashboardToolbar';
import type { Widget } from '../../types/dashboard';
import 'react-grid-layout/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

export interface DashboardProps {
  className?: string;
  showToolbar?: boolean;
  allowEditing?: boolean;
  onLayoutChange?: (widgets: Widget[]) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  className = '',
  showToolbar = true,
  allowEditing = true,
  onLayoutChange,
}) => {
  const {
    currentLayout,
    isEditing,
    isLocked,
    updateWidgetPosition,
    removeWidget,
    setBreakpoint,
    toggleEditing,
    toggleLocked,
  } = useDashboard();

  const [showWidgetLibrary, setShowWidgetLibrary] = useState(false);

  // Convert widgets to react-grid-layout format
  const layouts = useMemo(() => {
    if (!currentLayout) return { lg: [], md: [], sm: [], xs: [], xxs: [] };

    const baseLayout: Layout[] = currentLayout.widgets.map((widget) => ({
      i: widget.id,
      x: widget.x,
      y: widget.y,
      w: widget.w,
      h: widget.h,
      minW: widget.minW,
      minH: widget.minH,
      maxW: widget.maxW,
      maxH: widget.maxH,
      static: widget.static || isLocked,
      isDraggable: widget.isDraggable !== false && !isLocked,
      isResizable: widget.isResizable !== false && !isLocked,
    }));

    return {
      lg: baseLayout,
      md: baseLayout.map((l) => ({ ...l, w: Math.max(1, Math.floor(l.w * 0.8)) })),
      sm: baseLayout.map((l) => ({ ...l, w: Math.max(1, Math.floor(l.w * 0.6)) })),
      xs: baseLayout.map((l) => ({ ...l, w: Math.max(1, Math.floor(l.w * 0.5)) })),
      xxs: baseLayout.map((l) => ({ ...l, w: 1 })),
    };
  }, [currentLayout, isLocked]);

  // Handle layout changes from react-grid-layout
  const handleLayoutChange = useCallback(
    (currentBreakpointLayout: Layout[], _allLayouts: { [key: string]: Layout[] }) => {
      if (!currentLayout || isLocked) return;

      // Update widget positions
      currentBreakpointLayout.forEach((layoutItem) => {
        const widget = currentLayout.widgets.find((w) => w.id === layoutItem.i);
        if (widget) {
          const hasChanged =
            widget.x !== layoutItem.x ||
            widget.y !== layoutItem.y ||
            widget.w !== layoutItem.w ||
            widget.h !== layoutItem.h;

          if (hasChanged) {
            updateWidgetPosition(widget.id, {
              x: layoutItem.x,
              y: layoutItem.y,
              w: layoutItem.w,
              h: layoutItem.h,
            });
          }
        }
      });

      onLayoutChange?.(currentLayout.widgets);
    },
    [currentLayout, isLocked, updateWidgetPosition, onLayoutChange]
  );

  const handleBreakpointChange = useCallback(
    (newBreakpoint: string) => {
      setBreakpoint(newBreakpoint as any);
    },
    [setBreakpoint]
  );

  const handleRemoveWidget = useCallback(
    (widgetId: string) => {
      removeWidget(widgetId);
    },
    [removeWidget]
  );

  if (!currentLayout) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">No dashboard layout available</div>
      </div>
    );
  }

  return (
    <div className={`dashboard-container ${className}`}>
      {showToolbar && (
        <DashboardToolbar
          isEditing={isEditing}
          isLocked={isLocked}
          onToggleEditing={allowEditing ? toggleEditing : undefined}
          onToggleLocked={toggleLocked}
          onAddWidget={() => setShowWidgetLibrary(true)}
          showEditControls={allowEditing}
        />
      )}

      <div className="dashboard-content relative">
        <ResponsiveGridLayout
          className="dashboard-grid"
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={80}
          margin={[16, 16]}
          containerPadding={[16, 16]}
          isDraggable={isEditing && !isLocked}
          isResizable={isEditing && !isLocked}
          onLayoutChange={handleLayoutChange}
          onBreakpointChange={handleBreakpointChange}
          draggableHandle=".widget-drag-handle"
          compactType="vertical"
          preventCollision={false}
        >
          {currentLayout.widgets.map((widget) => (
            <div key={widget.id} className="dashboard-grid-item">
              <WidgetContainer
                widget={widget}
                isEditing={isEditing}
                onRemove={() => handleRemoveWidget(widget.id)}
              />
            </div>
          ))}
        </ResponsiveGridLayout>

        {/* Empty state */}
        {currentLayout.widgets.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center text-gray-500"
          >
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold mb-2">No Widgets Added</h3>
            <p className="text-sm mb-4">Add widgets to start building your dashboard</p>
            {allowEditing && (
              <button
                onClick={() => setShowWidgetLibrary(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Widget
              </button>
            )}
          </motion.div>
        )}
      </div>

      {/* Widget Library Modal */}
      <AnimatePresence>
        {showWidgetLibrary && (
          <WidgetLibrary
            onClose={() => setShowWidgetLibrary(false)}
            onSelectWidget={() => setShowWidgetLibrary(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
