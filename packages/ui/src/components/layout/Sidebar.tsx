/**
 * Sidebar Navigation Component
 * Responsive sidebar with nested menu support
 */

import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { navigationItems, type NavItem } from '../../routes';
import { cn } from '../../utils/cn';

export interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen = true,
  onClose,
  className = '',
}) => {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (path: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const isActive = (path: string): boolean => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const renderNavItem = (item: NavItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.path);
    const active = isActive(item.path);

    return (
      <div key={item.path} className="nav-item-wrapper">
        {hasChildren ? (
          <>
            <button
              onClick={() => toggleExpanded(item.path)}
              className={cn(
                'nav-item nav-item-button',
                active && 'nav-item-active',
                level > 0 && 'nav-item-nested'
              )}
              style={{ paddingLeft: `${0.75 + level * 1}rem` }}
            >
              <div className="nav-item-content">
                {item.icon && (
                  <span className="nav-item-icon">{item.icon}</span>
                )}
                <span className="nav-item-label">{item.label}</span>
                {item.badge && (
                  <span className="nav-item-badge">{item.badge}</span>
                )}
              </div>
              <svg
                className={cn(
                  'nav-item-chevron',
                  isExpanded && 'nav-item-chevron-expanded'
                )}
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="nav-item-children"
                >
                  {item.children?.map((child) => renderNavItem(child, level + 1))}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <NavLink
            to={item.path}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'nav-item nav-item-link',
                isActive && 'nav-item-active',
                level > 0 && 'nav-item-nested'
              )
            }
            style={{ paddingLeft: `${0.75 + level * 1}rem` }}
          >
            <div className="nav-item-content">
              {item.icon && (
                <span className="nav-item-icon">{item.icon}</span>
              )}
              <span className="nav-item-label">{item.label}</span>
              {item.badge && (
                <span className="nav-item-badge">{item.badge}</span>
              )}
            </div>
          </NavLink>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && onClose && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="sidebar-overlay md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          x: isOpen ? 0 : -280,
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={cn('sidebar', className)}
      >
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="4" y="4" width="7" height="7" rx="1" fill="currentColor" />
                <rect x="13" y="4" width="7" height="7" rx="1" fill="currentColor" opacity="0.7" />
                <rect x="4" y="13" width="7" height="7" rx="1" fill="currentColor" opacity="0.7" />
                <rect x="13" y="13" width="7" height="7" rx="1" fill="currentColor" opacity="0.5" />
              </svg>
            </div>
            <span className="sidebar-logo-text">Noa UI</span>
          </div>

          {/* Mobile close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="sidebar-close md:hidden"
              aria-label="Close sidebar"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navigationItems.map((item) => renderNavItem(item))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">User</div>
              <div className="sidebar-user-role">Admin</div>
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;
