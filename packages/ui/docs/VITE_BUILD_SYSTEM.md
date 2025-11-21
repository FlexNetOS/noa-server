# Vite Build System Documentation

## Overview

The NOA UI package uses Vite 6.0 with aggressive optimization strategies to achieve <500KB gzipped bundle size while maintaining excellent developer experience and production performance.

## Quick Start

```bash
# Development
npm run dev              # Start dev server (http://localhost:5173)

# Production
npm run build            # Production build
npm run build:analyze    # Build + bundle analysis
npm run preview          # Preview production build

# Analysis & Testing
npm run analyze          # Analyze bundle
npm run lighthouse       # Run Lighthouse CI
```

## Architecture

### Build Plugins

1. **@vitejs/plugin-react**: React Fast Refresh + JSX optimization
2. **vite-plugin-pwa**: Progressive Web App with Workbox
3. **vite-plugin-compression2**: Gzip + Brotli compression
4. **rollup-plugin-visualizer**: Bundle analysis visualization

### Code Splitting Strategy

The build system implements multi-level code splitting:

#### 1. Vendor Chunks (Stable Dependencies)

```typescript
react-vendor:     React + ReactDOM (stable)
router-vendor:    React Router (stable)
ui-vendor:        bits-ui + @radix-ui + framer-motion
form-vendor:      react-hook-form + zod
chart-vendor:     recharts + d3 (large, lazy loaded)
data-vendor:      xlsx + papaparse (large, lazy loaded)
utils-vendor:     axios + date-fns + zustand
```

**Benefits**:
- Vendor chunks cached separately
- Application code can change without invalidating vendor cache
- Parallel chunk loading for faster initial load

#### 2. Route-Based Splitting

All routes lazy-loaded using React.lazy():

```typescript
// Routes are automatically split
const Dashboard = lazy(() => import('./routes/Dashboard'));
const Metrics = lazy(() => import('./routes/Metrics'));
const Settings = lazy(() => import('./routes/Settings'));

// Usage with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/dashboard" element={<Dashboard />} />
  </Routes>
</Suspense>
```

#### 3. Component-Level Splitting

Heavy components split on-demand:

```typescript
// Chart components (only loaded when needed)
const LineChart = lazy(() => import('@components/charts/LineChart'));

// Modal dialogs (loaded on interaction)
const ExportModal = lazy(() => import('@components/modals/ExportModal'));
```

### Asset Optimization

#### Inline Assets (<4KB)

Small assets are inlined as base64 to reduce HTTP requests:

```typescript
assetsInlineLimit: 4096  // 4KB threshold
```

#### Image Optimization

- **Format**: WebP preferred, with PNG/JPG fallbacks
- **Lazy Loading**: Images below the fold lazy-loaded
- **Responsive Images**: srcset for different screen sizes
- **Compression**: 80% quality for optimal size/quality ratio

#### Font Optimization

```css
@font-face {
  font-family: 'Inter';
  font-display: swap;        /* Prevent invisible text */
  unicode-range: U+0000-00FF; /* Load only required subsets */
}
```

#### CSS Optimization

- **Code Splitting**: CSS split per route
- **Purging**: Tailwind removes unused styles
- **Minification**: cssnano minification
- **Critical CSS**: Inlined in HTML for faster FCP

### Minification

#### Terser Configuration

```typescript
terserOptions: {
  compress: {
    drop_console: true,      // Remove console.log
    drop_debugger: true,     // Remove debugger
    pure_funcs: [            // Remove specific functions
      'console.log',
      'console.info',
      'console.debug'
    ],
    passes: 2                // Run minification twice
  },
  format: {
    comments: false          // Remove all comments
  }
}
```

**Results**:
- 15-20% size reduction from console removal
- 10-15% additional reduction from multiple passes
- No comments in production bundles

### Compression

Dual compression strategy for maximum compatibility:

#### Gzip Compression

```typescript
compression({
  algorithm: 'gzip',
  threshold: 1024,           // Only files >1KB
  deleteOriginFile: false    // Keep original files
})
```

**Compression Ratios**:
- JavaScript: 70-80% reduction
- CSS: 75-85% reduction
- HTML: 60-70% reduction

#### Brotli Compression

```typescript
compression({
  algorithm: 'brotliCompress',
  threshold: 1024
})
```

**Benefits**:
- 15-20% better compression than gzip
- Supported by all modern browsers
- Automatic fallback to gzip for older browsers

## Progressive Web App (PWA)

### Manifest

```json
{
  "name": "NOA UI Dashboard",
  "short_name": "NOA",
  "display": "standalone",
  "theme_color": "#6366f1",
  "background_color": "#0f172a"
}
```

### Service Worker Strategies

#### Network-First (API Requests)

```typescript
{
  urlPattern: /^https:\/\/api\./,
  handler: 'NetworkFirst',
  options: {
    cacheName: 'api-cache',
    expiration: { maxAgeSeconds: 300 },  // 5 minutes
    networkTimeoutSeconds: 10
  }
}
```

**Use Case**: Dynamic API data that changes frequently

#### Cache-First (Static Assets)

```typescript
{
  urlPattern: /\.(js|css|woff2)$/,
  handler: 'CacheFirst',
  options: {
    cacheName: 'static-cache',
    expiration: { maxAgeSeconds: 2592000 }  // 30 days
  }
}
```

**Use Case**: JavaScript, CSS, fonts that rarely change

#### Stale-While-Revalidate (CDN Resources)

```typescript
{
  urlPattern: /^https:\/\/cdn\./,
  handler: 'StaleWhileRevalidate',
  options: {
    cacheName: 'cdn-cache',
    expiration: { maxAgeSeconds: 2592000 }
  }
}
```

**Use Case**: CDN resources that update occasionally

### Offline Support

- **Offline Page**: `/offline.html` served when network unavailable
- **Background Sync**: Failed API requests queued and retried
- **Push Notifications**: Real-time updates even when app closed
- **App Shortcuts**: Quick access to key features

## Performance Monitoring

### Bundle Analysis

Run after every build:

```bash
npm run build:analyze
```

**Outputs**:

1. **Interactive Visualization** (`docs/bundle-stats.html`)
   - Treemap view of bundle composition
   - Click to zoom into chunks
   - Gzip/Brotli size comparison

2. **JSON Report** (`docs/bundle-report.json`)
   ```json
   {
     "totalSize": 1500000,
     "totalGzipSize": 450000,
     "chunks": [
       {
         "file": "react-vendor.js",
         "size": 300000,
         "gzipSize": 90000,
         "percentage": 20
       }
     ]
   }
   ```

3. **Text Report** (`docs/bundle-report.txt`)
   - Human-readable summary
   - Warnings for oversized chunks
   - Optimization recommendations

### Lighthouse CI

Automated performance testing:

```bash
npm run lighthouse
```

**Metrics Tracked**:

| Metric | Target | Budget |
|--------|--------|--------|
| Performance Score | ≥90 | Must pass |
| First Contentful Paint | <1.8s | Critical |
| Largest Contentful Paint | <2.5s | Critical |
| Total Blocking Time | <300ms | Critical |
| Cumulative Layout Shift | <0.1 | Critical |
| Time to Interactive | <3.8s | Important |
| Speed Index | <3.0s | Important |

**Assertions**:
- Fails build if Performance < 90
- Warns if Accessibility < 90
- Generates detailed HTML report

### Performance Budget

See `scripts/performance-budget.json`:

```json
{
  "budgets": [
    {
      "path": "/*",
      "resourceSizes": [
        { "resourceType": "script", "budget": 300 },
        { "resourceType": "stylesheet", "budget": 50 },
        { "resourceType": "total", "budget": 500 }
      ]
    }
  ]
}
```

## Build Optimization Techniques

### 1. Tree Shaking

Ensure optimal tree shaking:

```typescript
// ✅ Good - tree shakeable
import { Button, Input } from '@components/ui';

// ❌ Bad - imports everything
import * as UI from '@components/ui';

// ✅ Good - named exports
export { Button } from './Button';

// ❌ Bad - default export with side effects
export default Button;
```

### 2. Dynamic Imports

Load heavy dependencies on-demand:

```typescript
// Load PDF library only when exporting
const exportToPDF = async (data) => {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  // ... export logic
};

// Load Excel library only when needed
const importFromExcel = async (file) => {
  const XLSX = await import('xlsx');
  // ... import logic
};
```

**Benefits**:
- Initial bundle reduced by 100-200KB
- Faster initial page load
- Better user experience

### 3. Preloading Critical Resources

```html
<!-- In index.html -->
<link rel="preconnect" href="https://api.example.com">
<link rel="dns-prefetch" href="https://cdn.example.com">
<link rel="preload" href="/fonts/inter.woff2" as="font" crossorigin>
```

### 4. Code Splitting Patterns

#### Feature-Based Splitting

```typescript
// Split by feature
const Admin = lazy(() => import('./features/admin'));
const Reports = lazy(() => import('./features/reports'));
```

#### Library Splitting

```typescript
// Split large libraries
const ExcelExport = lazy(() =>
  import(/* webpackChunkName: "excel" */ './exporters/excel')
);
```

#### Conditional Loading

```typescript
// Load only when condition met
if (user.role === 'admin') {
  const AdminTools = lazy(() => import('./admin-tools'));
}
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build & Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build with analysis
        run: npm run build:analyze

      - name: Run Lighthouse CI
        run: npm run lighthouse

      - name: Check bundle size
        run: |
          BUNDLE_SIZE=$(du -sb dist | cut -f1)
          MAX_SIZE=$((500 * 1024))
          if [ $BUNDLE_SIZE -gt $MAX_SIZE ]; then
            echo "❌ Bundle exceeds 500KB limit"
            exit 1
          fi

      - name: Upload bundle stats
        uses: actions/upload-artifact@v3
        with:
          name: bundle-stats
          path: docs/bundle-stats.html

      - name: Comment bundle size on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const report = JSON.parse(
              fs.readFileSync('docs/bundle-report.json')
            );
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## Bundle Size Report\n\n` +
                    `- Total: ${report.totalGzipSize / 1024}KB gzipped\n` +
                    `- Target: 500KB\n` +
                    `- Status: ${report.totalGzipSize < 512000 ? '✅ PASS' : '❌ FAIL'}`
            });
```

### Vercel Integration

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "installCommand": "npm install",
  "devCommand": "npm run dev"
}
```

## Environment Variables

### Development

```env
VITE_API_URL=http://localhost:3000
VITE_OPEN_BROWSER=false
VITE_SOURCEMAP=true
```

### Production

```env
VITE_API_URL=https://api.production.com
VITE_DROP_CONSOLE=true
VITE_COMPRESS_ASSETS=true
VITE_PWA_ENABLED=true
```

## Troubleshooting

### Bundle Too Large

1. **Identify culprits**:
   ```bash
   npm run build:analyze
   # Open docs/bundle-stats.html
   ```

2. **Check for duplicates**:
   ```bash
   npm dedupe
   ```

3. **Audit dependencies**:
   ```bash
   npx depcheck
   npm ls [package-name]
   ```

4. **Lazy load heavy components**:
   ```typescript
   const HeavyComponent = lazy(() => import('./HeavyComponent'));
   ```

### Poor Lighthouse Score

1. **Performance < 90**:
   - Check bundle size
   - Review render-blocking resources
   - Optimize images
   - Enable code splitting

2. **Accessibility < 90**:
   - Run axe DevTools
   - Fix contrast issues
   - Add ARIA labels

3. **Best Practices < 90**:
   - Enable HTTPS
   - Fix console errors
   - Update vulnerable dependencies

### Service Worker Issues

1. **Clear old caches**:
   ```javascript
   navigator.serviceWorker.getRegistrations()
     .then(registrations => {
       registrations.forEach(r => r.unregister());
     });
   ```

2. **Debug in DevTools**:
   - Application > Service Workers
   - Check for errors in Console
   - Verify cache storage

3. **Test in incognito**:
   - Eliminates cache conflicts
   - Fresh service worker registration

## Best Practices

1. **Monitor bundle size** on every PR
2. **Run Lighthouse CI** in your pipeline
3. **Use lazy loading** for routes and heavy components
4. **Optimize images** before committing
5. **Review dependencies** regularly (monthly)
6. **Test on real devices** with throttling
7. **Keep vendor chunks stable** for better caching
8. **Document performance wins** and regressions

## Resources

- [Vite Documentation](https://vitejs.dev/)
- [Workbox Documentation](https://developers.google.com/web/tools/workbox)
- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [Bundle Phobia](https://bundlephobia.com/)

## Maintenance Schedule

- **Weekly**: Review bundle analysis
- **Monthly**: Update dependencies, re-analyze
- **Quarterly**: Full Lighthouse audit
- **Release**: Complete CI/CD pipeline with all checks

---

**Target**: <500KB gzipped, >90 Lighthouse Performance
**Current Status**: Configured and ready
**Last Updated**: 2025-10-24
