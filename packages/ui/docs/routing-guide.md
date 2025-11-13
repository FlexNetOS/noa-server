# Routing System Guide

Complete guide to the React Router v6 routing system in the Noa UI package.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Route Configuration](#route-configuration)
- [Navigation](#navigation)
- [URL State Management](#url-state-management)
- [Deep Linking](#deep-linking)
- [Layout System](#layout-system)
- [Code Splitting](#code-splitting)
- [Testing](#testing)
- [Best Practices](#best-practices)

## Overview

The routing system provides:

- **React Router v6** with declarative routing
- **Lazy Loading** for optimal performance
- **Nested Routes** for complex layouts
- **URL State Sync** for deep linking
- **Breadcrumbs** auto-generated from routes
- **Protected Routes** with authentication guards
- **Type Safety** with TypeScript

## Quick Start

### Basic Setup

```tsx
import { AppRouter } from '@noa/ui';

function App() {
  return <AppRouter />;
}
```

### With Custom Wrapper

```tsx
import { BrowserRouter } from 'react-router-dom';
import { RootLayout } from '@noa/ui';

function App() {
  return (
    <BrowserRouter>
      <RootLayout />
    </BrowserRouter>
  );
}
```

## Route Configuration

### Available Routes

```tsx
import { ROUTES } from '@noa/ui';

ROUTES.DASHBOARD              // /
ROUTES.CHAT                   // /chat
ROUTES.CHAT_CONVERSATION      // /chat/:conversationId
ROUTES.FILES                  // /files
ROUTES.FILE_PREVIEW           // /files/:fileId
ROUTES.ANALYTICS              // /analytics
ROUTES.SETTINGS               // /settings
ROUTES.SETTINGS_PROFILE       // /settings/profile
ROUTES.SETTINGS_APPEARANCE    // /settings/appearance
ROUTES.SETTINGS_NOTIFICATIONS // /settings/notifications
```

### Route Metadata

```tsx
import { getRouteMetadata } from '@noa/ui';

const metadata = getRouteMetadata(ROUTES.ANALYTICS);
// {
//   title: 'Analytics',
//   description: 'Data insights and reports',
//   icon: <AnalyticsIcon />,
//   requiresAuth: true,
//   breadcrumb: 'Analytics'
// }
```

### Check Authentication

```tsx
import { requiresAuthentication } from '@noa/ui';

if (requiresAuthentication(ROUTES.ANALYTICS)) {
  // Redirect to login
}
```

## Navigation

### Link Component

```tsx
import { Link } from 'react-router-dom';
import { ROUTES } from '@noa/ui';

<Link to={ROUTES.CHAT}>Go to Chat</Link>
```

### Programmatic Navigation

```tsx
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@noa/ui';

function MyComponent() {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(ROUTES.DASHBOARD);
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <>
      <button onClick={handleClick}>Dashboard</button>
      <button onClick={handleGoBack}>Back</button>
    </>
  );
}
```

### NavLink with Active State

```tsx
import { NavLink } from 'react-router-dom';

<NavLink
  to={ROUTES.ANALYTICS}
  className={({ isActive }) =>
    isActive ? 'active-link' : 'link'
  }
>
  Analytics
</NavLink>
```

## URL State Management

### Single State Parameter

```tsx
import { useRouteState } from '@noa/ui';

function FilesPage() {
  const [filter, setFilter] = useRouteState('filter', {
    defaultValue: 'all',
  });

  // URL: /files?filter=active
  return (
    <select value={filter} onChange={(e) => setFilter(e.target.value)}>
      <option value="all">All</option>
      <option value="active">Active</option>
      <option value="archived">Archived</option>
    </select>
  );
}
```

### Multiple State Parameters

```tsx
import { useRouteStateMultiple } from '@noa/ui';

function AnalyticsPage() {
  const [state, setState] = useRouteStateMultiple({
    page: { defaultValue: 1 },
    sort: { defaultValue: 'date' },
    view: { defaultValue: 'table' },
  });

  // URL: /analytics?page=1&sort=date&view=table

  return (
    <>
      <button onClick={() => setState({ page: state.page + 1 })}>
        Next Page
      </button>
      <button onClick={() => setState({ sort: 'name' })}>
        Sort by Name
      </button>
      <button onClick={() => setState({ view: 'chart' })}>
        Chart View
      </button>
    </>
  );
}
```

### Query Parameters

```tsx
import { useQueryParam, useQueryParams } from '@noa/ui';

function SearchPage() {
  const [query, setQuery] = useQueryParam('q');
  const allParams = useQueryParams();

  return (
    <>
      <input
        value={query || ''}
        onChange={(e) => setQuery(e.target.value || null)}
      />
      <pre>{JSON.stringify(allParams, null, 2)}</pre>
    </>
  );
}
```

### Custom Serialization

```tsx
import { useRouteState } from '@noa/ui';

const [filters, setFilters] = useRouteState('filters', {
  defaultValue: {},
  serialize: (val) => JSON.stringify(val),
  deserialize: (val) => JSON.parse(val),
});

// URL: /page?filters=%7B%22category%22%3A%22tech%22%7D
```

## Deep Linking

### Link to Specific Conversation

```tsx
import { Link } from 'react-router-dom';

<Link to={`/chat/${conversationId}?search=test`}>
  Open Conversation with Search
</Link>
```

### Link with State Preservation

```tsx
// Current URL: /files?sort=date&view=grid
navigate(`/files/${fileId}`, {
  // Preserves query params
  search: location.search,
});
// Result: /files/123?sort=date&view=grid
```

### Shareable URLs

```tsx
function ConversationPage() {
  const { conversationId } = useParams();
  const [searchQuery] = useRouteState('search', { defaultValue: '' });

  // Share this URL:
  const shareUrl = `${window.location.origin}/chat/${conversationId}?search=${encodeURIComponent(searchQuery)}`;

  return (
    <button onClick={() => navigator.clipboard.writeText(shareUrl)}>
      Copy Link
    </button>
  );
}
```

## Layout System

### Root Layout

The `RootLayout` provides:
- Responsive sidebar navigation
- Header with breadcrumbs
- Mobile-friendly overlay menu

```tsx
import { RootLayout } from '@noa/ui';

// Automatically included in AppRouter
<RootLayout>
  <Outlet /> {/* Page content renders here */}
</RootLayout>
```

### Sidebar Navigation

```tsx
import { Sidebar } from '@noa/ui';

<Sidebar
  isOpen={sidebarOpen}
  onClose={() => setSidebarOpen(false)}
/>
```

### Breadcrumbs

```tsx
import { Breadcrumbs } from '@noa/ui';

<Breadcrumbs
  showHome={true}
  separator={<ChevronIcon />}
/>
// Renders: Home > Chat > Conversation 123
```

### Navigation Menu

```tsx
import { navigationItems } from '@noa/ui';

{navigationItems.map((item) => (
  <NavLink to={item.path}>
    {item.icon}
    <span>{item.label}</span>
    {item.badge && <Badge>{item.badge}</Badge>}
  </NavLink>
))}
```

## Code Splitting

### Lazy Loading

All pages are automatically code-split:

```tsx
// router.tsx
const DashboardPage = React.lazy(() => import('../pages/DashboardPage'));
const ChatPage = React.lazy(() => import('../pages/ChatPage'));

// Each page is a separate chunk, loaded on demand
```

### Loading States

```tsx
<Suspense fallback={<PageLoader message="Loading..." />}>
  <DashboardPage />
</Suspense>
```

### Preloading Routes

```tsx
import { prefetchQuery } from 'react-router-dom';

// Preload on hover
<Link
  to={ROUTES.ANALYTICS}
  onMouseEnter={() => {
    // Preload the route
    import('../pages/AnalyticsPage');
  }}
>
  Analytics
</Link>
```

## Testing

### Test with MemoryRouter

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

test('renders dashboard', () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
      </Routes>
    </MemoryRouter>
  );

  expect(screen.getByText('Dashboard')).toBeInTheDocument();
});
```

### Test Navigation

```tsx
import userEvent from '@testing-library/user-event';

test('navigates to chat', async () => {
  const user = userEvent.setup();

  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>
  );

  await user.click(screen.getByText('Chat'));

  expect(screen.getByText('Chat Page')).toBeInTheDocument();
});
```

### Test URL State

```tsx
test('syncs state with URL', async () => {
  render(
    <MemoryRouter initialEntries={['/?filter=active']}>
      <Routes>
        <Route path="/" element={<FilesPage />} />
      </Routes>
    </MemoryRouter>
  );

  expect(screen.getByText(/active/i)).toBeInTheDocument();
});
```

## Best Practices

### 1. Use Route Constants

```tsx
// ✅ Good
import { ROUTES } from '@noa/ui';
navigate(ROUTES.CHAT);

// ❌ Bad
navigate('/chat');
```

### 2. Type-Safe Parameters

```tsx
import { useParams } from 'react-router-dom';

function ConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  // conversationId is typed as string | undefined
}
```

### 3. Preserve Query Params

```tsx
// Preserve existing query params when navigating
const navigate = useNavigate();
const location = useLocation();

navigate('/new-page', {
  search: location.search, // Preserves ?filter=active&sort=date
});
```

### 4. Handle Loading States

```tsx
<Suspense fallback={<LoadingSpinner />}>
  <LazyComponent />
</Suspense>
```

### 5. Use URL State for Shareable State

```tsx
// ✅ Good - URL state for filters, pagination, etc.
const [page, setPage] = useRouteState('page', { defaultValue: 1 });

// ❌ Bad - Local state for shareable data
const [page, setPage] = useState(1);
```

### 6. Nested Routes for Layouts

```tsx
<Route path="/settings" element={<SettingsLayout />}>
  <Route path="profile" element={<ProfileSettings />} />
  <Route path="appearance" element={<AppearanceSettings />} />
</Route>
```

### 7. Error Boundaries

```tsx
<Route
  path="/analytics"
  element={<AnalyticsPage />}
  errorElement={<ErrorPage />}
/>
```

### 8. Accessibility

```tsx
// Use semantic navigation
<nav aria-label="Main navigation">
  <NavLink to={ROUTES.DASHBOARD}>Dashboard</NavLink>
</nav>

// Announce route changes to screen readers
<div role="status" aria-live="polite" aria-atomic="true">
  Navigated to {currentPage}
</div>
```

## Performance Tips

### Bundle Size Optimization

- Lazy load all pages (automatic)
- Use route-based code splitting
- Preload critical routes on app load

### Route Preloading

```tsx
// Preload routes during idle time
useEffect(() => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      import('../pages/AnalyticsPage');
      import('../pages/FilesPage');
    });
  }
}, []);
```

### Memoize Navigation Items

```tsx
import { navigationItems } from '@noa/ui';

// Already memoized in the package
const memoizedItems = useMemo(() => navigationItems, []);
```

## Troubleshooting

### Issue: Route Not Found

```tsx
// Check route path matches exactly
<Route path="/chat/:id" /> // ✅
<Route path="/chat/:conversationId" /> // Must match param name
```

### Issue: Query Params Not Updating

```tsx
// Use replace: true to avoid history entries
const [state, setState] = useRouteState('filter', {
  defaultValue: 'all',
  replace: true, // Don't create history entries
});
```

### Issue: Deep Link Not Working

```tsx
// Ensure your server redirects all routes to index.html
// For Vite:
// vite.config.ts
export default {
  preview: {
    historyApiFallback: true,
  },
};
```

## API Reference

See [routes/README.md](../src/routes/README.md) for complete API documentation.

## Examples

See [examples/routing-example.tsx](../src/examples/routing-example.tsx) for comprehensive examples.
