/**
 * Router Setup with Lazy Loading
 * Implements React Router v6 with code splitting and Suspense
 */

import React, { Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';
import { ROUTES, type AppRoute } from './index';

// Lazy-loaded page components
const DashboardPage = React.lazy(() => import('../pages/DashboardPage'));
const ChatPage = React.lazy(() => import('../pages/ChatPage'));
const ConversationPage = React.lazy(() => import('../pages/ConversationPage'));
const FilesPage = React.lazy(() => import('../pages/FilesPage'));
const FilePreviewPage = React.lazy(() => import('../pages/FilePreviewPage'));
const AnalyticsPage = React.lazy(() => import('../pages/AnalyticsPage'));
const SettingsPage = React.lazy(() => import('../pages/SettingsPage'));
const NotFoundPage = React.lazy(() => import('../pages/NotFoundPage'));

// Layout components
const RootLayout = React.lazy(() => import('../components/layout/RootLayout'));

// Loading component with fallback
const PageLoader: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
    <div className="text-center">
      <div className="relative w-16 h-16 mx-auto mb-4">
        <div className="absolute inset-0 border-4 border-blue-200 dark:border-blue-900 rounded-full" />
        <div className="absolute inset-0 border-4 border-blue-600 dark:border-blue-400 rounded-full border-t-transparent animate-spin" />
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
    </div>
  </div>
);

// Suspense wrapper with error boundary
interface SuspenseRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const SuspenseRoute: React.FC<SuspenseRouteProps> = ({
  children,
  fallback = <PageLoader />
}) => (
  <Suspense fallback={fallback}>
    {children}
  </Suspense>
);

// Protected route wrapper
interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true
}) => {
  // TODO: Replace with actual auth check
  const isAuthenticated = true; // Placeholder

  if (requireAuth && !isAuthenticated) {
    // Redirect to login or show unauthorized
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return <>{children}</>;
};

// Route configuration
const routes: AppRoute[] = [
  {
    path: '/',
    element: (
      <SuspenseRoute>
        <RootLayout />
      </SuspenseRoute>
    ),
    children: [
      {
        index: true,
        element: (
          <SuspenseRoute fallback={<PageLoader message="Loading dashboard..." />}>
            <DashboardPage />
          </SuspenseRoute>
        ),
      },
      {
        path: ROUTES.CHAT,
        element: (
          <ProtectedRoute>
            <SuspenseRoute fallback={<PageLoader message="Loading chat..." />}>
              <ChatPage />
            </SuspenseRoute>
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.CHAT_CONVERSATION,
        element: (
          <ProtectedRoute>
            <SuspenseRoute fallback={<PageLoader message="Loading conversation..." />}>
              <ConversationPage />
            </SuspenseRoute>
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.FILES,
        element: (
          <ProtectedRoute>
            <SuspenseRoute fallback={<PageLoader message="Loading files..." />}>
              <FilesPage />
            </SuspenseRoute>
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.FILE_PREVIEW,
        element: (
          <ProtectedRoute>
            <SuspenseRoute fallback={<PageLoader message="Loading file..." />}>
              <FilePreviewPage />
            </SuspenseRoute>
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.ANALYTICS,
        element: (
          <ProtectedRoute>
            <SuspenseRoute fallback={<PageLoader message="Loading analytics..." />}>
              <AnalyticsPage />
            </SuspenseRoute>
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.SETTINGS,
        element: (
          <ProtectedRoute>
            <SuspenseRoute fallback={<PageLoader message="Loading settings..." />}>
              <SettingsPage />
            </SuspenseRoute>
          </ProtectedRoute>
        ),
        children: [
          {
            index: true,
            element: <Navigate to={ROUTES.SETTINGS_PROFILE} replace />,
          },
          {
            path: 'profile',
            element: <div>Profile Settings</div>, // TODO: Create component
          },
          {
            path: 'appearance',
            element: <div>Appearance Settings</div>, // TODO: Create component
          },
          {
            path: 'notifications',
            element: <div>Notification Settings</div>, // TODO: Create component
          },
        ],
      },
      {
        path: ROUTES.NOT_FOUND,
        element: (
          <SuspenseRoute>
            <NotFoundPage />
          </SuspenseRoute>
        ),
      },
    ],
  },
];

// Create router instance
const router = createBrowserRouter(routes, {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true,
  },
});

// Router Provider Component
export const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};

export default AppRouter;
