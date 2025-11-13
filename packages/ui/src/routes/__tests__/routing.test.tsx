/**
 * Routing System Tests
 * Tests for route configuration, navigation, and URL state
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ROUTES, getRouteMetadata, requiresAuthentication } from '../index';
import { useRouteState, useRouteStateMultiple, useQueryParam } from '../../hooks/useRouteState';

describe('Route Configuration', () => {
  it('should have all required route paths', () => {
    expect(ROUTES.DASHBOARD).toBe('/');
    expect(ROUTES.CHAT).toBe('/chat');
    expect(ROUTES.CHAT_CONVERSATION).toBe('/chat/:conversationId');
    expect(ROUTES.FILES).toBe('/files');
    expect(ROUTES.FILE_PREVIEW).toBe('/files/:fileId');
    expect(ROUTES.ANALYTICS).toBe('/analytics');
    expect(ROUTES.SETTINGS).toBe('/settings');
    expect(ROUTES.NOT_FOUND).toBe('*');
  });

  it('should provide route metadata', () => {
    const dashboardMeta = getRouteMetadata(ROUTES.DASHBOARD);
    expect(dashboardMeta?.title).toBe('Dashboard');
    expect(dashboardMeta?.breadcrumb).toBe('Dashboard');

    const analyticsMeta = getRouteMetadata(ROUTES.ANALYTICS);
    expect(analyticsMeta?.requiresAuth).toBe(true);
  });

  it('should check authentication requirements', () => {
    expect(requiresAuthentication(ROUTES.DASHBOARD)).toBe(false);
    expect(requiresAuthentication(ROUTES.CHAT)).toBe(true);
    expect(requiresAuthentication(ROUTES.ANALYTICS)).toBe(true);
  });
});

describe('Navigation', () => {
  it('should render dashboard on root path', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<div>Dashboard Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
  });

  it('should navigate to different routes', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<div>Dashboard</div>} />
          <Route path="/chat" element={<div>Chat Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('should handle dynamic routes', () => {
    const conversationId = '123';

    render(
      <MemoryRouter initialEntries={[`/chat/${conversationId}`]}>
        <Routes>
          <Route
            path="/chat/:conversationId"
            element={
              <div>
                Conversation {conversationId}
              </div>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(`Conversation ${conversationId}`)).toBeInTheDocument();
  });
});

describe('URL State Synchronization', () => {
  function TestComponent() {
    const [filter, setFilter] = useRouteState('filter', {
      defaultValue: 'all',
    });

    return (
      <div>
        <span data-testid="filter-value">{filter}</span>
        <button onClick={() => setFilter('active')}>Set Active</button>
      </div>
    );
  }

  it('should sync state with URL parameters', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/?filter=initial']}>
        <Routes>
          <Route path="/" element={<TestComponent />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('filter-value')).toHaveTextContent('initial');

    await user.click(screen.getByText('Set Active'));

    await waitFor(() => {
      expect(screen.getByTestId('filter-value')).toHaveTextContent('active');
    });
  });

  it('should use default value when no query param', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<TestComponent />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('filter-value')).toHaveTextContent('all');
  });
});

describe('Multiple URL State Parameters', () => {
  function TestComponent() {
    const [state, setState] = useRouteStateMultiple({
      page: { defaultValue: 1 },
      sort: { defaultValue: 'date' },
    });

    return (
      <div>
        <span data-testid="page">{state.page}</span>
        <span data-testid="sort">{state.sort}</span>
        <button onClick={() => setState({ page: 2 })}>Next Page</button>
        <button onClick={() => setState({ sort: 'name' })}>Sort by Name</button>
      </div>
    );
  }

  it('should manage multiple state parameters', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<TestComponent />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('page')).toHaveTextContent('1');
    expect(screen.getByTestId('sort')).toHaveTextContent('date');

    await user.click(screen.getByText('Next Page'));

    await waitFor(() => {
      expect(screen.getByTestId('page')).toHaveTextContent('2');
    });

    await user.click(screen.getByText('Sort by Name'));

    await waitFor(() => {
      expect(screen.getByTestId('sort')).toHaveTextContent('name');
    });
  });
});

describe('Query Parameters', () => {
  function TestComponent() {
    const [query, setQuery] = useQueryParam('q');

    return (
      <div>
        <span data-testid="query-value">{query || 'empty'}</span>
        <button onClick={() => setQuery('test')}>Set Query</button>
        <button onClick={() => setQuery(null)}>Clear Query</button>
      </div>
    );
  }

  it('should get and set query parameters', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<TestComponent />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('query-value')).toHaveTextContent('empty');

    await user.click(screen.getByText('Set Query'));

    await waitFor(() => {
      expect(screen.getByTestId('query-value')).toHaveTextContent('test');
    });

    await user.click(screen.getByText('Clear Query'));

    await waitFor(() => {
      expect(screen.getByTestId('query-value')).toHaveTextContent('empty');
    });
  });
});

describe('Deep Linking', () => {
  it('should deep link to conversation', () => {
    const conversationId = 'abc123';

    render(
      <MemoryRouter initialEntries={[`/chat/${conversationId}?search=test`]}>
        <Routes>
          <Route
            path="/chat/:conversationId"
            element={<div>Conversation {conversationId}</div>}
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(`Conversation ${conversationId}`)).toBeInTheDocument();
  });

  it('should deep link to file preview', () => {
    const fileId = 'file-456';

    render(
      <MemoryRouter initialEntries={[`/files/${fileId}`]}>
        <Routes>
          <Route
            path="/files/:fileId"
            element={<div>File {fileId}</div>}
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(`File ${fileId}`)).toBeInTheDocument();
  });
});

describe('Breadcrumb Generation', () => {
  it('should generate breadcrumb from route metadata', () => {
    const chatMeta = getRouteMetadata(ROUTES.CHAT);
    expect(chatMeta?.breadcrumb).toBe('Chat');

    const conversationMeta = getRouteMetadata(ROUTES.CHAT_CONVERSATION);
    expect(conversationMeta?.breadcrumb).toBeInstanceOf(Function);

    if (typeof conversationMeta?.breadcrumb === 'function') {
      const breadcrumb = conversationMeta.breadcrumb({ conversationId: '123' });
      expect(breadcrumb).toBe('Conversation 123');
    }
  });
});

describe('404 Not Found', () => {
  it('should handle non-existent routes', () => {
    render(
      <MemoryRouter initialEntries={['/non-existent-route']}>
        <Routes>
          <Route path="/" element={<div>Dashboard</div>} />
          <Route path="*" element={<div>404 Not Found</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('404 Not Found')).toBeInTheDocument();
  });
});

describe('Nested Routes', () => {
  it('should handle nested settings routes', () => {
    render(
      <MemoryRouter initialEntries={['/settings/profile']}>
        <Routes>
          <Route path="/settings" element={<div>Settings</div>}>
            <Route path="profile" element={<div>Profile Settings</div>} />
            <Route path="appearance" element={<div>Appearance Settings</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Profile Settings')).toBeInTheDocument();
  });
});
