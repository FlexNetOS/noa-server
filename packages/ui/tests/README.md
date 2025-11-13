# UI Package Test Suite

Comprehensive test coverage for the @noa/ui package with >80% code coverage target.

## Test Structure

```
tests/
├── e2e/                    # Playwright E2E tests
│   ├── chat.spec.ts        # Chat interface flow tests
│   ├── files.spec.ts       # File upload/browser tests
│   ├── dashboard.spec.ts   # Dashboard customization tests
│   ├── accessibility.spec.ts # WCAG 2.1 AA validation
│   └── performance.spec.ts # Performance benchmarks
├── integration/            # Integration tests
│   ├── streaming.test.ts   # SSE streaming tests
│   ├── websocket.test.ts   # WebSocket connection tests
│   └── file-operations.test.ts # File upload/download tests
├── unit/                   # Unit tests
│   ├── hooks.test.ts       # Custom hooks tests
│   ├── utilities.test.ts   # Utility functions tests
│   └── stores.test.ts      # Zustand stores tests
├── helpers/                # Test utilities
│   ├── test-utils.tsx      # Custom render and mocks
│   └── README.md           # Helper documentation
├── setup.ts                # Test environment setup
└── README.md               # This file
```

## Running Tests

### All Tests

```bash
pnpm test:all
```

### Unit Tests Only

```bash
pnpm test:unit
```

### Integration Tests Only

```bash
pnpm test:integration
```

### E2E Tests

```bash
# Run all browsers
pnpm test:e2e

# Run with UI
pnpm test:e2e:ui

# Run headed (see browser)
pnpm test:e2e:headed

# Debug mode
pnpm test:e2e:debug
```

### Coverage Reports

```bash
pnpm test:coverage
```

### Accessibility Tests

```bash
pnpm test:a11y
```

## Test Categories

### E2E Tests (Playwright)

**Browser Coverage**: Chrome, Firefox, Safari, Edge, Mobile Chrome, Mobile Safari

#### Chat Interface (`chat.spec.ts`)
- Initial state and empty state display
- Sending and receiving messages
- Markdown rendering and code highlighting
- Message actions (copy, delete, edit, regenerate)
- Auto-scroll behavior
- Performance with large message counts

#### File Operations (`files.spec.ts`)
- Single and multiple file uploads
- Drag-and-drop functionality
- Upload progress tracking
- File validation (type, size)
- File browser with search and filters
- File preview (text, images, PDFs)
- File download functionality
- Keyboard navigation

#### Dashboard (`dashboard.spec.ts`)
- Default layout rendering
- Adding and removing widgets
- Widget configuration
- Drag-and-drop widget positioning
- Widget resizing
- Layout persistence
- Responsive behavior (mobile, tablet, desktop)
- Widget interactions (refresh, maximize)

#### Accessibility (`accessibility.spec.ts`)
- **WCAG 2.1 AA Compliance** using axe-core
- Keyboard navigation (Tab, Shift+Tab, Enter, Space)
- Focus management and indicators
- ARIA attributes and roles
- Screen reader compatibility
- Color contrast ratios (light and dark modes)
- Touch target sizes
- Form validation and error announcements

#### Performance (`performance.spec.ts`)
- Page load metrics (FCP, LCP, CLS, TBT)
- JavaScript bundle size
- Code splitting and lazy loading
- Rendering performance (60 FPS)
- Memory usage and leak detection
- Network optimization (request count, caching, compression)
- Lighthouse metrics

### Integration Tests (Vitest)

#### SSE Streaming (`streaming.test.ts`)
- EventSource connection management
- Message streaming and chunked data
- Custom events
- Error handling and recovery
- Reconnection with exponential backoff
- Performance with high-frequency messages

#### WebSocket (`websocket.test.ts`)
- WebSocket connection lifecycle
- Bidirectional communication
- JSON and binary data
- Connection state tracking
- Reconnection strategies
- Heartbeat/ping-pong
- Message queueing
- Error handling

#### File Operations (`file-operations.test.ts`)
- File upload with progress tracking
- Multiple file uploads and batching
- Upload cancellation
- File validation (type, size, extension)
- File processing (thumbnails, hash calculation)
- Download with progress
- Retry logic and resumable uploads

### Unit Tests (Vitest)

#### Hooks (`hooks.test.ts`)
- `useFileUpload` - File upload management
- `useChatHistory` - Chat history database operations
- `useVirtualization` - Large list virtualization
- `useDashboard` - Dashboard layout management
- `useDataAnalytics` - Data processing and statistics
- `useChartTheme` - Chart theming and customization

#### Utilities (`utilities.test.ts`)
- `cn` - Class name merging
- File validation and categorization
- Data export (JSON, CSV)
- Chat export (Markdown, JSON)
- Performance measurement
- File hashing
- Chart rendering

#### Stores (`stores.test.ts`)
- `useChatHistoryStore` - Chat state management
- `useFileBrowserStore` - File browser state
- `useDashboardLayoutStore` - Dashboard layout persistence
- `useAnalyticsStore` - Analytics data management

## Test Helpers

Custom test utilities in `tests/helpers/test-utils.tsx`:

- **Custom Render**: Render with providers
- **Mock Files**: `createMockFile`, `createMockImage`
- **Mock Data**: `createMockMessages`, `createMockFiles`
- **Browser API Mocks**: localStorage, IntersectionObserver, ResizeObserver, matchMedia
- **Network Mocks**: fetch, WebSocket
- **IndexedDB Mock**: For Dexie.js testing
- **Performance Helpers**: `measureTestPerformance`

## Coverage Targets

- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 80%
- **Statements**: 80%

## Best Practices

1. **Test Isolation**: Each test should be independent and not rely on other tests
2. **Mock External Dependencies**: Use mocks for API calls, databases, and browser APIs
3. **Accessibility First**: Always include accessibility tests for new components
4. **Performance Monitoring**: Include performance benchmarks for critical paths
5. **Cleanup**: Always clean up mocks and subscriptions in `afterEach` hooks
6. **Descriptive Names**: Use clear, descriptive test names that explain what is being tested
7. **AAA Pattern**: Arrange, Act, Assert - structure tests clearly
8. **Edge Cases**: Test happy paths, error cases, and edge cases

## Debugging Tests

### Vitest

```bash
# Run tests in watch mode
pnpm test

# Run with UI
pnpm test:ui

# Debug specific test
pnpm test tests/unit/hooks.test.ts
```

### Playwright

```bash
# Debug mode with browser inspector
pnpm test:e2e:debug

# Run specific test file
pnpm test:e2e tests/e2e/chat.spec.ts

# Show browser while running
pnpm test:e2e:headed
```

## CI/CD Integration

The test suite is designed to run in CI environments:

- **Parallel Execution**: Tests run in parallel for speed
- **Retries**: E2E tests retry on failure (2 retries in CI)
- **Artifacts**: Screenshots and videos on failure
- **Reports**: HTML, JSON, and JUnit reports generated

## Dependencies

### Testing Frameworks
- **Playwright** ^1.56.0 - E2E testing
- **Vitest** ^3.2.0 - Unit and integration testing
- **@testing-library/react** ^16.1.0 - Component testing utilities
- **@testing-library/user-event** ^14.5.2 - User interaction simulation

### Accessibility
- **@axe-core/playwright** ^4.10.0 - Automated accessibility testing
- **jest-axe** ^9.0.0 - Vitest accessibility testing

### Mocks and Utilities
- **fake-indexeddb** ^6.0.0 - IndexedDB mocking
- **msw** ^2.6.0 - API mocking
- **@vitest/coverage-v8** ^2.1.8 - Code coverage

## Contributing

When adding new features:

1. **Write tests first** (TDD approach preferred)
2. **Include all test types**: Unit, integration, and E2E where applicable
3. **Test accessibility**: Use axe-core scans
4. **Add performance tests**: For critical features
5. **Update this README**: Document new test files or patterns
6. **Maintain coverage**: Ensure >80% coverage threshold is met

## Troubleshooting

### Common Issues

**Issue**: Tests fail with "element not found"
**Solution**: Increase timeout or use `waitFor` from @testing-library/react

**Issue**: E2E tests timeout
**Solution**: Check `playwright.config.ts` timeout settings, ensure dev server is running

**Issue**: Coverage below threshold
**Solution**: Add tests for uncovered files, check coverage report in `coverage/` directory

**Issue**: Flaky tests
**Solution**: Add proper `waitFor` assertions, avoid hard-coded timeouts, ensure test isolation

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Vitest Documentation](https://vitest.dev)
- [Testing Library Documentation](https://testing-library.com)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [axe-core Rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
