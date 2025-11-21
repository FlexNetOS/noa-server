# Build & Bundle Optimization Guide

## Overview

This guide documents the comprehensive build optimization strategy for the NOA UI package, targeting <500KB gzipped bundle size with optimal code splitting and PWA support.

## Bundle Size Targets

### Overall Targets
- **Total Bundle**: <500KB gzipped
- **Initial Chunk**: <200KB gzipped
- **Vendor Chunks**: <150KB each gzipped
- **Route Chunks**: <50KB each gzipped

### Performance Metrics
- **First Contentful Paint (FCP)**: <1.8s
- **Largest Contentful Paint (LCP)**: <2.5s
- **Total Blocking Time (TBT)**: <300ms
- **Cumulative Layout Shift (CLS)**: <0.1
- **Speed Index**: <3.0s
- **Time to Interactive (TTI)**: <3.8s

## Code Splitting Strategy

### 1. Vendor Chunking

The build system splits vendor dependencies into optimized chunks:

```typescript
// React core (stable, rarely changes)
- react-vendor: React + ReactDOM
- router-vendor: React Router

// UI libraries (frequently used)
- ui-vendor: bits-ui + @radix-ui + framer-motion
- form-vendor: react-hook-form + zod

// Data visualization (large, lazy loadable)
- chart-vendor: recharts + d3
- data-vendor: xlsx + papaparse

// Utilities (small, frequently used)
- utils-vendor: axios + date-fns + zustand
```

### 2. Route-Based Splitting

All routes are lazy-loaded using React.lazy():

```typescript
const Dashboard = lazy(() => import('./routes/Dashboard'));
const Metrics = lazy(() => import('./routes/Metrics'));
const Settings = lazy(() => import('./routes/Settings'));
```

### 3. Component-Level Splitting

Heavy components are split separately:

```typescript
// Chart components (only loaded when needed)
const LineChart = lazy(() => import('@components/charts/LineChart'));
const DataTable = lazy(() => import('@components/charts/DataTable'));

// Modal dialogs (loaded on demand)
const ExportModal = lazy(() => import('@components/modals/ExportModal'));
```

## Build Configuration

### Vite Configuration Highlights

```typescript
// vite.config.ts
{
  build: {
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,      // Remove console.log in production
        drop_debugger: true,     // Remove debugger statements
        pure_funcs: ['console.log', 'console.info'],
        passes: 2,               // Run minification twice for better results
      }
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Strategic chunking logic (see vite.config.ts)
        }
      }
    }
  }
}
```

### Asset Optimization

- **Inline Limit**: 4KB (assets <4KB inlined as base64)
- **Image Formats**: WebP preferred, with PNG/JPG fallbacks
- **Font Loading**: `font-display: swap` for better FCP
- **CSS**: Code-split per route, minified and purged

## PWA Implementation

### Service Worker Strategy

The service worker implements multiple caching strategies:

```typescript
// API requests: Network-first with 5-minute cache
NetworkFirst({ cacheName: 'api-cache', maxAgeSeconds: 300 })

// Static assets: Cache-first with 30-day expiration
CacheFirst({ cacheName: 'static-cache', maxAgeSeconds: 2592000 })

// Images: Cache-first with 7-day expiration
CacheFirst({ cacheName: 'image-cache', maxAgeSeconds: 604800 })

// CDN resources: Stale-while-revalidate
StaleWhileRevalidate({ cacheName: 'cdn-cache' })
```

### Offline Support

- Offline fallback page (`/offline.html`)
- Background sync for failed API requests
- Push notification support
- App shortcuts for quick navigation

### Manifest Configuration

```json
{
  "name": "NOA UI Dashboard",
  "short_name": "NOA",
  "theme_color": "#6366f1",
  "background_color": "#0f172a",
  "display": "standalone",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "purpose": "any maskable" },
    { "src": "/icon-512.png", "sizes": "512x512", "purpose": "any maskable" }
  ]
}
```

## Performance Monitoring

### Bundle Analysis

Run bundle analysis after every build:

```bash
npm run build:analyze
```

This generates:
- `docs/bundle-stats.html` - Interactive treemap visualization
- `docs/bundle-report.json` - Detailed JSON report
- `docs/bundle-report.txt` - Human-readable text report

### Lighthouse CI

Automated performance testing:

```bash
npm run lighthouse
```

Targets:
- Performance: ≥90
- Accessibility: ≥90
- Best Practices: ≥90
- SEO: ≥80
- PWA: ≥80

### Performance Budget

See `scripts/performance-budget.json` for detailed budgets:

```json
{
  "resourceSizes": [
    { "resourceType": "script", "budget": 300 },
    { "resourceType": "stylesheet", "budget": 50 },
    { "resourceType": "total", "budget": 500 }
  ],
  "timings": [
    { "metric": "interactive", "budget": 3800 },
    { "metric": "first-contentful-paint", "budget": 1800 }
  ]
}
```

## Optimization Techniques

### 1. Tree Shaking

All imports use named imports for optimal tree shaking:

```typescript
// ✅ Good - tree shakeable
import { Button, Input } from '@components/ui';

// ❌ Bad - imports everything
import * as UI from '@components/ui';
```

### 2. Dynamic Imports

Heavy dependencies loaded only when needed:

```typescript
// Load PDF export only when export is triggered
const exportPDF = async (data) => {
  const { jsPDF } = await import('jspdf');
  // ... export logic
};
```

### 3. Image Optimization

- Use WebP format with fallbacks
- Lazy load images below the fold
- Implement responsive images with srcset
- Compress images to 80% quality

### 4. Font Optimization

```css
/* Optimize font loading */
@font-face {
  font-family: 'Inter';
  font-display: swap;
  /* Load only required weights and subsets */
  unicode-range: U+0000-00FF;
}
```

### 5. CSS Optimization

- Tailwind CSS purging removes unused styles
- Critical CSS inlined in HTML
- Non-critical CSS loaded asynchronously
- CSS modules for component-specific styles

## Build Scripts

### Development

```bash
npm run dev              # Start dev server with HMR
```

### Production

```bash
npm run build            # Production build
npm run build:analyze    # Build + bundle analysis
npm run preview          # Preview production build
```

### Analysis & Testing

```bash
npm run analyze          # Analyze existing build
npm run lighthouse       # Run Lighthouse CI
npm run perf:budget      # Check performance budget
```

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Build and analyze
  run: |
    npm run build:analyze
    npm run lighthouse

- name: Upload bundle stats
  uses: actions/upload-artifact@v3
  with:
    name: bundle-stats
    path: docs/bundle-stats.html

- name: Check bundle size
  run: |
    BUNDLE_SIZE=$(du -sb dist | cut -f1)
    MAX_SIZE=$((500 * 1024))  # 500KB
    if [ $BUNDLE_SIZE -gt $MAX_SIZE ]; then
      echo "Bundle size exceeds limit!"
      exit 1
    fi
```

## Troubleshooting

### Bundle Too Large

1. Run `npm run build:analyze` to identify large chunks
2. Check for duplicate dependencies with `npm dedupe`
3. Review imports - ensure tree shaking is working
4. Consider lazy loading more components
5. Audit and remove unused dependencies

### Poor Lighthouse Score

1. Check network throttling settings
2. Verify all images are optimized
3. Review render-blocking resources
4. Check for layout shifts (CLS)
5. Optimize third-party scripts

### Service Worker Issues

1. Clear cache: `navigator.serviceWorker.getRegistrations()`
2. Verify workbox configuration
3. Check for conflicts with dev tools
4. Test in private/incognito mode
5. Review cache strategies

## Best Practices

1. **Monitor bundle size** on every PR
2. **Run Lighthouse CI** in your pipeline
3. **Use lazy loading** for routes and heavy components
4. **Optimize images** before committing
5. **Review dependencies** regularly
6. **Test on real devices** with throttling
7. **Keep vendor chunks** stable for better caching
8. **Document performance** wins and regressions

## Resources

- [Vite Build Optimization](https://vitejs.dev/guide/build.html)
- [Workbox PWA Guide](https://developers.google.com/web/tools/workbox)
- [Lighthouse Performance](https://web.dev/lighthouse-performance/)
- [Web Vitals](https://web.dev/vitals/)
- [Bundle Analysis Tools](https://bundlephobia.com/)

## Maintenance

- **Weekly**: Review bundle analysis reports
- **Monthly**: Update dependencies and re-analyze
- **Quarterly**: Performance audit with Lighthouse
- **Release**: Full Lighthouse CI run with assertions

---

**Target**: <500KB gzipped, >90 Lighthouse Performance Score
**Status**: Configured and ready for optimization
**Last Updated**: 2025-10-24
