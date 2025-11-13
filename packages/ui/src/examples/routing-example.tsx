/**
 * Routing System Example
 * Demonstrates routing features and usage patterns
 */


import { createRoot } from 'react-dom/client';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AppRouter } from '../routes/router';
import { ROUTES, navigationItems } from '../routes';
import { useRouteState, useRouteStateMultiple, useQueryParam } from '../hooks/useRouteState';

// Import styles
import '../styles/routing.css';
import '../styles/globals.css';

/**
 * Example 1: Basic Router Setup
 */
export function BasicRouterExample() {
  return <AppRouter />;
}

/**
 * Example 2: Navigation Links
 */
export function NavigationExample() {
  return (
    <nav className="flex gap-4 p-4">
      <Link
        to={ROUTES.DASHBOARD}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Dashboard
      </Link>
      <Link
        to={ROUTES.CHAT}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Chat
      </Link>
      <Link
        to={ROUTES.FILES}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Files
      </Link>
      <Link
        to={ROUTES.ANALYTICS}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Analytics
      </Link>
    </nav>
  );
}

/**
 * Example 3: Programmatic Navigation
 */
export function ProgrammaticNavigationExample() {
  const navigate = useNavigate();

  const handleGoToChat = () => {
    navigate(ROUTES.CHAT);
  };

  const handleGoToConversation = () => {
    const conversationId = Date.now().toString();
    navigate(`/chat/${conversationId}`);
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="p-4 space-y-2">
      <button
        onClick={handleGoToChat}
        className="block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Go to Chat
      </button>
      <button
        onClick={handleGoToConversation}
        className="block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Create New Conversation
      </button>
      <button
        onClick={handleGoBack}
        className="block px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
      >
        Go Back
      </button>
    </div>
  );
}

/**
 * Example 4: URL State Synchronization
 */
export function URLStateExample() {
  // Single state parameter - use union type for type-safe updates
  type FilterType = 'all' | 'active' | 'archived';
  const [filter, setFilter] = useRouteState<FilterType>('filter', {
    defaultValue: 'all',
  });

  // Multiple state parameters - properly typed for numeric and string values
  const [state, setState] = useRouteStateMultiple<{
    page: number;
    sort: string;
    view: string;
  }>({
    page: { defaultValue: 1 },
    sort: { defaultValue: 'date' },
    view: { defaultValue: 'grid' },
  });

  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Single State</h3>
        <p className="text-sm text-gray-600 mb-2">Current filter: {filter}</p>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            All
          </button>
          <button
            onClick={() => setFilter('active')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Active
          </button>
          <button
            onClick={() => setFilter('archived')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Archived
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Multiple States</h3>
        <p className="text-sm text-gray-600 mb-2">
          Page: {state.page} | Sort: {state.sort} | View: {state.view}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setState({ page: state.page + 1 })}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Next Page
          </button>
          <button
            onClick={() => setState({ sort: state.sort === 'date' ? 'name' : 'date' })}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Toggle Sort
          </button>
          <button
            onClick={() => setState({ view: state.view === 'grid' ? 'list' : 'grid' })}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Toggle View
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Example 5: Deep Linking to Conversation
 */
export function DeepLinkingExample() {
  const conversations = [
    { id: '123', title: 'Project Discussion' },
    { id: '456', title: 'Bug Report' },
    { id: '789', title: 'Feature Request' },
  ];

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">Conversations (Deep Link)</h3>
      <div className="space-y-2">
        {conversations.map((conv) => (
          <div
            key={conv.id}
            className="p-3 bg-white rounded-lg border border-gray-200 flex items-center justify-between"
          >
            <span>{conv.title}</span>
            <Link
              to={`/chat/${conv.id}`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Open
            </Link>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <p className="text-sm text-gray-600">
          Try copying the URL when viewing a conversation - it will deep link directly to that conversation!
        </p>
      </div>
    </div>
  );
}

/**
 * Example 6: Query Parameters
 */
export function QueryParamsExample() {
  const [searchQuery, setSearchQuery] = useQueryParam('q');
  const [category, setCategory] = useQueryParam('category');
  const location = useLocation();

  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Current URL</h3>
        <code className="block p-3 bg-gray-100 rounded-lg text-sm">
          {location.pathname}{location.search}
        </code>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Search Query</h3>
        <input
          type="text"
          value={searchQuery || ''}
          onChange={(e) => setSearchQuery(e.target.value || null)}
          placeholder="Enter search query..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Category</h3>
        <select
          value={category || ''}
          onChange={(e) => setCategory(e.target.value || null)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">All Categories</option>
          <option value="tech">Technology</option>
          <option value="design">Design</option>
          <option value="business">Business</option>
        </select>
      </div>
    </div>
  );
}

/**
 * Example 7: Navigation Menu from Config
 */
export function NavigationMenuExample() {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="p-4 bg-white rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold mb-4">Navigation Menu</h3>
      <ul className="space-y-1">
        {navigationItems.map((item) => (
          <li key={item.path}>
            <Link
              to={item.path}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                isActive(item.path)
                  ? 'bg-blue-50 text-blue-600'
                  : 'hover:bg-gray-50'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.badge && (
                <span className="ml-auto px-2 py-0.5 text-xs bg-blue-600 text-white rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>

            {item.children && isActive(item.path) && (
              <ul className="ml-8 mt-1 space-y-1">
                {item.children.map((child) => (
                  <li key={child.path}>
                    <Link
                      to={child.path}
                      className={`block px-4 py-2 rounded-lg transition-colors ${
                        isActive(child.path)
                          ? 'bg-blue-50 text-blue-600'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      {child.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Full Application Example
 */
export function FullApplicationExample() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AppRouter />
    </div>
  );
}

import React from 'react';

// Mount to DOM
if (typeof window !== 'undefined') {
  const container = document.getElementById('root');
  if (container) {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <FullApplicationExample />
      </React.StrictMode>
    );
  }
}

/**
 * Example Usage in Tests
 */
export function TestExample() {
  // Use MemoryRouter for testing
  return `
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRouter } from './routes/router';

test('renders dashboard on root path', () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <AppRouter />
    </MemoryRouter>
  );
  expect(screen.getByText('Dashboard')).toBeInTheDocument();
});

test('deep links to conversation', () => {
  render(
    <MemoryRouter initialEntries={['/chat/123']}>
      <AppRouter />
    </MemoryRouter>
  );
  expect(screen.getByText(/Conversation 123/)).toBeInTheDocument();
});
  `;
}
