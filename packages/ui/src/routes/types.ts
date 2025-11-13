/**
 * Routing Type Definitions
 */

import { RouteObject } from 'react-router-dom';
import React from 'react';

/**
 * Route metadata for breadcrumbs, navigation, and SEO
 */
export interface RouteMetadata {
  /** Page title */
  title: string;
  /** Page description */
  description?: string;
  /** Icon component for navigation */
  icon?: React.ReactNode;
  /** Requires user authentication */
  requiresAuth?: boolean;
  /** Breadcrumb text or function to generate from params */
  breadcrumb?: string | ((params: Record<string, string>) => string);
  /** Roles required to access this route */
  roles?: string[];
  /** Custom layout component */
  layout?: React.ComponentType;
  /** Route meta tags for SEO */
  meta?: {
    keywords?: string[];
    og?: {
      title?: string;
      description?: string;
      image?: string;
    };
  };
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

/**
 * Navigation item for sidebar/menu
 */
export interface NavItem {
  /** Route path */
  path: string;
  /** Display label */
  label: string;
  /** Icon component */
  icon?: React.ReactNode;
  /** Nested navigation items */
  children?: NavItem[];
  /** Badge text/number */
  badge?: string | number;
  /** External link */
  external?: boolean;
  /** Hidden in navigation */
  hidden?: boolean;
  /** Disabled state */
  disabled?: boolean;
}

/**
 * Breadcrumb item
 */
export interface Breadcrumb {
  /** Route path */
  path: string;
  /** Display label */
  label: string;
  /** Is last breadcrumb */
  isLast: boolean;
}

/**
 * Route guard function
 */
export type RouteGuard = (
  route: AppRoute,
  context?: RouteGuardContext
) => boolean | Promise<boolean>;

/**
 * Route guard context
 */
export interface RouteGuardContext {
  /** Current user */
  user?: {
    id: string;
    roles: string[];
    permissions: string[];
  };
  /** Current location */
  location: Location;
  /** Navigation function */
  navigate: (path: string) => void;
}

/**
 * Route transition config
 */
export interface RouteTransition {
  /** Transition type */
  type: 'fade' | 'slide' | 'scale' | 'none';
  /** Transition duration in ms */
  duration?: number;
  /** Transition easing */
  easing?: string;
}

/**
 * Route preload strategy
 */
export type PreloadStrategy = 'eager' | 'lazy' | 'hover' | 'visible';

/**
 * Route configuration options
 */
export interface RouteConfig {
  /** Base path for all routes */
  basePath?: string;
  /** Default transition */
  defaultTransition?: RouteTransition;
  /** Preload strategy */
  preloadStrategy?: PreloadStrategy;
  /** Error boundary component */
  errorBoundary?: React.ComponentType<{ error: Error }>;
  /** Loading component */
  loadingComponent?: React.ComponentType;
  /** Route guards */
  guards?: RouteGuard[];
}
