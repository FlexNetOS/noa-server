/**
 * Route Configuration
 * Centralized route definitions with metadata
 */

import React from 'react';
import type { RouteObject } from 'react-router-dom';

// Route metadata for breadcrumbs and navigation
export interface RouteMetadata {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  requiresAuth?: boolean;
  breadcrumb?: string | ((params: any) => string);
}

/**
 * Extended route object with metadata
 * Note: Using type intersection instead of interface extension because
 * RouteObject is a union type (IndexRouteObject | NonIndexRouteObject)
 */
export type AppRoute = RouteObject & {
  meta?: RouteMetadata;
  children?: AppRoute[];
};

// Route paths constants
export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/',
  CHAT: '/chat',
  CHAT_CONVERSATION: '/chat/:conversationId',
  FILES: '/files',
  FILE_PREVIEW: '/files/:fileId',
  ANALYTICS: '/analytics',
  SETTINGS: '/settings',
  SETTINGS_PROFILE: '/settings/profile',
  SETTINGS_APPEARANCE: '/settings/appearance',
  SETTINGS_NOTIFICATIONS: '/settings/notifications',
  NOT_FOUND: '*',
} as const;

// Icons for routes (using inline SVG for zero dependencies)
const DashboardIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="7" height="9" x="3" y="3" rx="1" />
    <rect width="7" height="5" x="14" y="3" rx="1" />
    <rect width="7" height="9" x="14" y="12" rx="1" />
    <rect width="7" height="5" x="3" y="16" rx="1" />
  </svg>
);

const ChatIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const FilesIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
  </svg>
);

const AnalyticsIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 3v18h18" />
    <path d="m19 9-5 5-4-4-3 3" />
  </svg>
);

const SettingsIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

// Route definitions with metadata
export const routeMetadata: Record<string, RouteMetadata> = {
  [ROUTES.DASHBOARD]: {
    title: 'Dashboard',
    description: 'Overview and analytics',
    icon: <DashboardIcon />,
    breadcrumb: 'Dashboard',
  },
  [ROUTES.CHAT]: {
    title: 'Chat',
    description: 'AI conversations',
    icon: <ChatIcon />,
    requiresAuth: true,
    breadcrumb: 'Chat',
  },
  [ROUTES.CHAT_CONVERSATION]: {
    title: 'Conversation',
    description: 'Chat conversation details',
    icon: <ChatIcon />,
    requiresAuth: true,
    breadcrumb: (params) => `Conversation ${params.conversationId}`,
  },
  [ROUTES.FILES]: {
    title: 'Files',
    description: 'File management',
    icon: <FilesIcon />,
    requiresAuth: true,
    breadcrumb: 'Files',
  },
  [ROUTES.FILE_PREVIEW]: {
    title: 'File Preview',
    description: 'View file details',
    icon: <FilesIcon />,
    requiresAuth: true,
    breadcrumb: (params) => params.fileId,
  },
  [ROUTES.ANALYTICS]: {
    title: 'Analytics',
    description: 'Data insights and reports',
    icon: <AnalyticsIcon />,
    requiresAuth: true,
    breadcrumb: 'Analytics',
  },
  [ROUTES.SETTINGS]: {
    title: 'Settings',
    description: 'Application settings',
    icon: <SettingsIcon />,
    requiresAuth: true,
    breadcrumb: 'Settings',
  },
  [ROUTES.SETTINGS_PROFILE]: {
    title: 'Profile Settings',
    breadcrumb: 'Profile',
  },
  [ROUTES.SETTINGS_APPEARANCE]: {
    title: 'Appearance Settings',
    breadcrumb: 'Appearance',
  },
  [ROUTES.SETTINGS_NOTIFICATIONS]: {
    title: 'Notification Settings',
    breadcrumb: 'Notifications',
  },
};

// Navigation menu structure
export interface NavItem {
  path: string;
  label: string;
  icon?: React.ReactNode;
  children?: NavItem[];
  badge?: string | number;
}

export const navigationItems: NavItem[] = [
  {
    path: ROUTES.DASHBOARD,
    label: 'Dashboard',
    icon: <DashboardIcon />,
  },
  {
    path: ROUTES.CHAT,
    label: 'Chat',
    icon: <ChatIcon />,
  },
  {
    path: ROUTES.FILES,
    label: 'Files',
    icon: <FilesIcon />,
  },
  {
    path: ROUTES.ANALYTICS,
    label: 'Analytics',
    icon: <AnalyticsIcon />,
  },
  {
    path: ROUTES.SETTINGS,
    label: 'Settings',
    icon: <SettingsIcon />,
    children: [
      {
        path: ROUTES.SETTINGS_PROFILE,
        label: 'Profile',
      },
      {
        path: ROUTES.SETTINGS_APPEARANCE,
        label: 'Appearance',
      },
      {
        path: ROUTES.SETTINGS_NOTIFICATIONS,
        label: 'Notifications',
      },
    ],
  },
];

// Helper to get route metadata
export const getRouteMetadata = (path: string): RouteMetadata | undefined => {
  return routeMetadata[path];
};

// Helper to check if route requires authentication
export const requiresAuthentication = (path: string): boolean => {
  return routeMetadata[path]?.requiresAuth ?? false;
};
