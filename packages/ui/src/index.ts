/**
 * @noa/ui - Main Entry Point
 * Comprehensive UI Components Library with TailwindCSS 4.0
 */

// Primitive UI Components (Design System)
export * from './components/ui/index.js';

// Advanced Components
export * from './components/dashboard/index.js';
export * from './components/chat/index.js';
export * from './components/files/index.js';

// Layout Components
export * from './components/layout';

// Dashboard Widgets (react-grid-layout)
export { Dashboard } from './components/dashboard/Dashboard';
export type { DashboardProps } from './components/dashboard/Dashboard';
export { WidgetContainer } from './components/dashboard/Widget';
export type { WidgetContainerProps } from './components/dashboard/Widget';
export { WidgetLibrary } from './components/dashboard/WidgetLibrary';
export type { WidgetLibraryProps } from './components/dashboard/WidgetLibrary';
export { DashboardToolbar } from './components/dashboard/DashboardToolbar';
export type { DashboardToolbarProps } from './components/dashboard/DashboardToolbar';

// Dashboard Widgets
export * from './widgets';

// Routing System
export { AppRouter } from './routes/router';
export {
  ROUTES,
  navigationItems,
  getRouteMetadata,
  requiresAuthentication,
} from './routes';
export type {
  RouteMetadata,
  NavItem,
  AppRoute,
  Breadcrumb,
  RouteGuard,
  RouteGuardContext,
  RouteTransition,
  PreloadStrategy,
  RouteConfig,
} from './routes/types';

// Stores
export { chatHistoryDB, ChatHistoryDB } from './stores/chatHistory.js';
export { useChatHistory } from './hooks/useChatHistory.js';
export { useDashboardStore } from './stores/dashboardLayout';

// Hooks
export { useFileUpload } from './hooks/useFileUpload.js';
export type { UseFileUploadOptions, UseFileUploadReturn } from './hooks/useFileUpload.js';
export { useDashboard, useWidgetData } from './hooks/useDashboard';
export type { UseDashboardOptions } from './hooks/useDashboard';
export {
  useRouteState,
  useRouteStateMultiple,
  useQueryParam,
  useQueryParams,
} from './hooks/useRouteState';
export type { UseRouteStateOptions } from './hooks/useRouteState';

// Utilities
export * from './utils/index.js';
export * from './utils/cn.js';
export * from './utils/fileValidation.js';
export {
  exportConversation,
  exportConversations,
  exportAndDownload,
  downloadExport,
} from './utils/exportChat.js';

// Types
export type {
  Conversation,
  Message,
  MessageMetadata,
  SearchResult,
  SearchHighlight,
  SearchOptions,
  ExportFormat,
  ExportOptions,
  PaginationOptions,
  PaginatedResult,
  DatabaseStats,
  DatabaseHealth,
  MigrationInfo,
} from './types/chatHistory.js';
export * from './types/files.js';
export type {
  Widget,
  WidgetType,
  WidgetSettings,
  WidgetPosition,
  WidgetProps,
  WidgetData,
  WidgetLibraryItem,
  DashboardLayout,
  DashboardState,
  DashboardConfig,
  ExportedDashboard,
  LayoutBreakpoint,
} from './types/dashboard';

// Styles & Themes
export * from './styles/themes.js';
