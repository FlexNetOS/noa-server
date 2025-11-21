# Routing System

This directory contains the React Router v6 routing configuration for the Noa UI package.

## Structure

```
routes/
├── index.tsx           # Route configuration and metadata
├── router.tsx          # Router setup with lazy loading
└── README.md          # This file
```

## Features

### 1. Route Configuration (`index.tsx`)

- **Route Paths**: Centralized route path constants
- **Metadata**: Title, description, icons, auth requirements, breadcrumbs
- **Navigation Items**: Sidebar navigation structure with nesting support
- **Helper Functions**: `getRouteMetadata()`, `requiresAuthentication()`

### 2. Router Setup (`router.tsx`)

- **Lazy Loading**: All pages use `React.lazy()` for code splitting
- **Suspense**: Loading states with custom fallback components
- **Protected Routes**: Authentication guard wrapper
- **Nested Routes**: Settings page with sub-routes
- **404 Handling**: Catch-all route for not found pages

### 3. Layout Components

- **RootLayout**: Main app layout with sidebar and header
- **Sidebar**: Responsive navigation with nested menu support
- **Breadcrumbs**: Auto-generated from route hierarchy

### 4. URL State Management

The `useRouteState` hook syncs component state with URL query parameters:

```tsx
// Single parameter
const [filter, setFilter] = useRouteState('filter', {
  defaultValue: 'all',
});

// Multiple parameters
const [state, setState] = useRouteStateMultiple({
  page: { defaultValue: 1 },
  sort: { defaultValue: 'date' },
  view: { defaultValue: 'grid' },
});
```

## Route Structure

```
/ → Dashboard
├── /chat → Chat list
│   └── /chat/:conversationId → Conversation view
├── /files → File browser
│   └── /files/:fileId → File preview
├── /analytics → Analytics dashboard
├── /settings → Settings (redirects to /settings/profile)
│   ├── /settings/profile → Profile settings
│   ├── /settings/appearance → Appearance settings
│   └── /settings/notifications → Notification settings
└── * → 404 Not Found
```

## Usage

### Basic Setup

```tsx
import { AppRouter } from './routes/router';

function App() {
  return <AppRouter />;
}
```

### Navigation

```tsx
import { Link, useNavigate } from 'react-router-dom';
import { ROUTES } from './routes';

// Using Link
<Link to={ROUTES.CHAT}>Go to Chat</Link>

// Programmatic navigation
const navigate = useNavigate();
navigate(ROUTES.DASHBOARD);
```

### Route Metadata

```tsx
import { getRouteMetadata, ROUTES } from './routes';

const metadata = getRouteMetadata(ROUTES.ANALYTICS);
// { title: 'Analytics', icon: <AnalyticsIcon />, ... }
```

### Protected Routes

Routes with `requiresAuth: true` will check authentication before rendering:

```tsx
// In route metadata
[ROUTES.ANALYTICS]: {
  title: 'Analytics',
  requiresAuth: true,
  // ...
}
```

### Deep Linking

All pages support deep linking with URL state:

```tsx
// /analytics?view=chart&chartType=line&timeRange=7d
const [state, setState] = useRouteStateMultiple({
  view: { defaultValue: 'table' },
  chartType: { defaultValue: 'line' },
  timeRange: { defaultValue: '7d' },
});

// URL automatically updates when state changes
setState({ view: 'chart' });
// → /analytics?view=chart
```

## Performance

### Code Splitting

Each page is lazy-loaded with `React.lazy()`:

```tsx
const DashboardPage = React.lazy(() => import('../pages/DashboardPage'));
```

This splits the code into separate chunks, loaded only when needed.

### Bundle Size Impact

- Base router: ~30KB (react-router-dom)
- Each page chunk: 5-20KB (loaded on demand)
- Total initial bundle reduction: ~60-80KB

### Loading States

Custom loading components for each page:

```tsx
<Suspense fallback={<PageLoader message="Loading dashboard..." />}>
  <DashboardPage />
</Suspense>
```

## Accessibility

- **ARIA labels**: All navigation elements have proper labels
- **Keyboard navigation**: Full keyboard support
- **Focus management**: Focus is managed on route transitions
- **Screen readers**: Breadcrumbs and navigation are screen reader friendly

## Browser Support

- Modern browsers with ES6+ support
- React Router v6 requires React 16.8+
- History API required (no hash routing)

## Future Enhancements

- [ ] Add route-based code preloading
- [ ] Implement route-level error boundaries
- [ ] Add route transition animations
- [ ] Support for route-based data fetching
- [ ] Add route guards for roles/permissions
- [ ] Implement route-level analytics tracking

## Testing

Test route configuration and navigation:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRouter } from './router';

test('renders dashboard on root path', () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <AppRouter />
    </MemoryRouter>
  );
  expect(screen.getByText('Dashboard')).toBeInTheDocument();
});
```

## Dependencies

- `react-router-dom`: v6.x
- `framer-motion`: For animations
- `react`: v18.x
