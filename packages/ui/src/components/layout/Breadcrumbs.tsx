/**
 * Breadcrumbs Component
 * Auto-generated breadcrumb navigation from route hierarchy
 */

import React, { useMemo } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { routeMetadata } from '../../routes';
import { cn } from '../../utils/cn';

export interface BreadcrumbsProps {
  className?: string;
  separator?: React.ReactNode;
  showHome?: boolean;
}

interface Breadcrumb {
  path: string;
  label: string;
  isLast: boolean;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  className = '',
  separator,
  showHome = true,
}) => {
  const location = useLocation();
  const params = useParams();

  const breadcrumbs = useMemo(() => {
    const paths = location.pathname.split('/').filter(Boolean);
    const crumbs: Breadcrumb[] = [];

    // Add home breadcrumb
    if (showHome) {
      crumbs.push({
        path: '/',
        label: 'Home',
        isLast: paths.length === 0,
      });
    }

    // Build breadcrumbs from path segments
    let currentPath = '';
    paths.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === paths.length - 1;

      // Get metadata for this route
      const metadata = routeMetadata[currentPath];

      let label = segment;
      if (metadata?.breadcrumb) {
        if (typeof metadata.breadcrumb === 'function') {
          label = metadata.breadcrumb(params);
        } else {
          label = metadata.breadcrumb;
        }
      } else {
        // Capitalize and format segment
        label = segment
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }

      crumbs.push({
        path: currentPath,
        label,
        isLast,
      });
    });

    return crumbs;
  }, [location.pathname, params, showHome]);

  const defaultSeparator = (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="breadcrumb-separator-icon"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );

  if (breadcrumbs.length <= 1 && !showHome) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('breadcrumbs', className)}
    >
      <ol className="breadcrumb-list">
        {breadcrumbs.map((crumb, index) => (
          <motion.li
            key={crumb.path}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="breadcrumb-item"
          >
            {!crumb.isLast ? (
              <>
                <Link
                  to={crumb.path}
                  className="breadcrumb-link"
                >
                  {crumb.label}
                </Link>
                <span className="breadcrumb-separator" aria-hidden="true">
                  {separator || defaultSeparator}
                </span>
              </>
            ) : (
              <span className="breadcrumb-current" aria-current="page">
                {crumb.label}
              </span>
            )}
          </motion.li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
