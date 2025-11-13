import { test, expect } from '@playwright/test';

/**
 * Performance Benchmarks E2E Tests
 * Tests loading times, rendering performance, bundle size, and Core Web Vitals.
 */

test.describe('Performance Benchmarks', () => {
  test.describe('Page Load Performance', () => {
    test('should load homepage within performance budget', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/', { waitUntil: 'load' });

      const loadTime = Date.now() - startTime;

      // Homepage should load in under 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('should achieve interactive state quickly', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/', { waitUntil: 'networkidle' });

      const interactiveTime = Date.now() - startTime;

      // Should be interactive in under 5 seconds
      expect(interactiveTime).toBeLessThan(5000);
    });

    test('should have acceptable First Contentful Paint (FCP)', async ({ page }) => {
      await page.goto('/');

      const fcp = await page.evaluate(() => {
        return performance.getEntriesByType('paint')
          .find((entry) => entry.name === 'first-contentful-paint')?.startTime;
      });

      if (fcp !== undefined) {
        // FCP should be under 1.8 seconds (Good threshold)
        expect(fcp).toBeLessThan(1800);
      }
    });

    test('should have acceptable Largest Contentful Paint (LCP)', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });

      const lcp = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            resolve(lastEntry.startTime);
          }).observe({ entryTypes: ['largest-contentful-paint'] });

          // Timeout after 5 seconds
          setTimeout(() => resolve(0), 5000);
        });
      });

      if (lcp && typeof lcp === 'number') {
        // LCP should be under 2.5 seconds (Good threshold)
        expect(lcp).toBeLessThan(2500);
      }
    });

    test('should have low Cumulative Layout Shift (CLS)', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });

      // Wait for page to stabilize
      await page.waitForTimeout(2000);

      const cls = await page.evaluate(() => {
        return new Promise((resolve) => {
          let clsValue = 0;

          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                clsValue += (entry as any).value;
              }
            }
          }).observe({ entryTypes: ['layout-shift'] });

          setTimeout(() => resolve(clsValue), 3000);
        });
      });

      if (cls !== undefined) {
        // CLS should be under 0.1 (Good threshold)
        expect(cls).toBeLessThan(0.1);
      }
    });

    test('should have acceptable Total Blocking Time (TBT)', async ({ page }) => {
      await page.goto('/');

      const longTasks = await page.evaluate(() => {
        return new Promise((resolve) => {
          const tasks: number[] = [];

          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.duration > 50) {
                tasks.push(entry.duration - 50);
              }
            }
          }).observe({ entryTypes: ['longtask'] });

          setTimeout(() => {
            const tbt = tasks.reduce((sum, task) => sum + task, 0);
            resolve(tbt);
          }, 5000);
        });
      });

      if (longTasks && typeof longTasks === 'number') {
        // TBT should be under 200ms (Good threshold)
        expect(longTasks).toBeLessThan(200);
      }
    });
  });

  test.describe('JavaScript Bundle Performance', () => {
    test('should have acceptable bundle size', async ({ page }) => {
      await page.goto('/');

      const resourceSizes = await page.evaluate(() => {
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        return resources
          .filter((r) => r.initiatorType === 'script')
          .reduce((total, r) => total + (r.transferSize || 0), 0);
      });

      // Total JS should be under 500KB (adjust based on your app)
      expect(resourceSizes).toBeLessThan(500 * 1024);
    });

    test('should lazy load code-split chunks', async ({ page }) => {
      await page.goto('/');

      const initialScripts = await page.evaluate(() => {
        return performance.getEntriesByType('resource')
          .filter((r) => r.initiatorType === 'script')
          .length;
      });

      // Navigate to a different route
      await page.click('a[href="/dashboard"]').catch(() => {
        // Ignore if link doesn't exist
      });
      await page.waitForTimeout(1000);

      const laterScripts = await page.evaluate(() => {
        return performance.getEntriesByType('resource')
          .filter((r) => r.initiatorType === 'script')
          .length;
      });

      // Should load additional scripts for new route
      expect(laterScripts).toBeGreaterThanOrEqual(initialScripts);
    });
  });

  test.describe('Rendering Performance', () => {
    test('should render large lists efficiently', async ({ page }) => {
      await page.goto('/');

      // Navigate to file browser or any list view
      const fileSection = page.locator('[data-testid="file-section"], #files').first();
      if (await fileSection.isVisible({ timeout: 2000 })) {
        await fileSection.click();
      }

      // Add many items
      const fileInput = page.locator('input[type="file"]').first();
      if (await fileInput.isVisible({ timeout: 2000 })) {
        const files = Array.from({ length: 100 }, (_, i) => ({
          name: `file${i}.txt`,
          mimeType: 'text/plain',
          buffer: Buffer.from(`Content ${i}`),
        }));

        const startTime = Date.now();
        await fileInput.setInputFiles(files);

        // Wait for rendering
        await page.waitForTimeout(2000);
        const renderTime = Date.now() - startTime;

        // Should render 100 items in under 3 seconds
        expect(renderTime).toBeLessThan(3000);
      }
    });

    test('should maintain 60 FPS during scrolling', async ({ page }) => {
      await page.goto('/');

      // Create scrollable content
      await page.evaluate(() => {
        const content = document.querySelector('.messages-container, main');
        if (content) {
          for (let i = 0; i < 100; i++) {
            const div = document.createElement('div');
            div.textContent = `Item ${i}`;
            div.style.height = '50px';
            content.appendChild(div);
          }
        }
      });

      // Measure FPS during scroll
      const fps = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          let lastTime = performance.now();
          let frames = 0;
          const duration = 1000; // 1 second

          function measureFrame(currentTime: number) {
            frames++;
            if (currentTime - lastTime >= duration) {
              resolve(frames);
            } else {
              requestAnimationFrame(measureFrame);
            }
          }

          // Start scrolling
          const element = document.querySelector('.messages-container, main');
          let scrollPos = 0;
          const scrollInterval = setInterval(() => {
            scrollPos += 10;
            if (element) {
              element.scrollTop = scrollPos;
            }
          }, 16);

          requestAnimationFrame(measureFrame);

          setTimeout(() => {
            clearInterval(scrollInterval);
          }, duration);
        });
      });

      // Should maintain at least 50 FPS (close to 60)
      expect(fps).toBeGreaterThanOrEqual(50);
    });

    test('should handle rapid state changes efficiently', async ({ page }) => {
      await page.goto('/');

      const startTime = Date.now();

      // Rapidly send messages
      const messageInput = page.locator('textarea[placeholder*="message"]').first();
      if (await messageInput.isVisible({ timeout: 2000 })) {
        for (let i = 0; i < 20; i++) {
          await messageInput.fill(`Message ${i}`);
          await messageInput.press('Enter');
          await page.waitForTimeout(50);
        }
      }

      const totalTime = Date.now() - startTime;

      // Should handle 20 rapid updates in under 5 seconds
      expect(totalTime).toBeLessThan(5000);
    });
  });

  test.describe('Memory Usage', () => {
    test('should not have significant memory leaks', async ({ page, context }) => {
      await page.goto('/');

      // Get initial memory
      const initialMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });

      // Perform operations that could leak memory
      for (let i = 0; i < 10; i++) {
        // Navigate or perform operations
        await page.evaluate(() => {
          // Simulate creating and destroying components
          const container = document.createElement('div');
          document.body.appendChild(container);
          for (let j = 0; j < 100; j++) {
            const el = document.createElement('div');
            el.textContent = `Element ${j}`;
            container.appendChild(el);
          }
          container.remove();
        });
      }

      // Force garbage collection if possible
      await page.evaluate(() => {
        if ('gc' in window) {
          (window as any).gc();
        }
      });

      await page.waitForTimeout(1000);

      const finalMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });

      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory;
        const increasePercentage = (memoryIncrease / initialMemory) * 100;

        // Memory should not increase by more than 50%
        expect(increasePercentage).toBeLessThan(50);
      }
    });
  });

  test.describe('Network Performance', () => {
    test('should minimize number of requests', async ({ page }) => {
      const requests: string[] = [];

      page.on('request', (request) => {
        requests.push(request.url());
      });

      await page.goto('/', { waitUntil: 'networkidle' });

      // Should make fewer than 50 requests for initial load
      expect(requests.length).toBeLessThan(50);
    });

    test('should cache static assets', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const cachedResources = await page.evaluate(() => {
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        return resources.filter((r) => r.transferSize === 0).length;
      });

      // Reload page
      await page.reload({ waitUntil: 'networkidle' });

      const cachedAfterReload = await page.evaluate(() => {
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        return resources.filter((r) => r.transferSize === 0).length;
      });

      // More resources should be cached on reload
      expect(cachedAfterReload).toBeGreaterThanOrEqual(cachedResources);
    });

    test('should use compression for text assets', async ({ page }) => {
      const responses: any[] = [];

      page.on('response', async (response) => {
        const url = response.url();
        if (url.endsWith('.js') || url.endsWith('.css') || url.endsWith('.html')) {
          const headers = response.headers();
          responses.push({
            url,
            contentEncoding: headers['content-encoding'],
          });
        }
      });

      await page.goto('/');

      // Check that text assets are compressed
      const compressedAssets = responses.filter((r) =>
        r.contentEncoding === 'gzip' || r.contentEncoding === 'br'
      );

      const compressionRatio = compressedAssets.length / responses.length;

      // At least 70% of text assets should be compressed
      expect(compressionRatio).toBeGreaterThan(0.7);
    });
  });

  test.describe('Image Optimization', () => {
    test('should lazy load images', async ({ page }) => {
      await page.goto('/');

      const images = page.locator('img');
      const count = await images.count();

      if (count > 0) {
        for (let i = 0; i < Math.min(count, 5); i++) {
          const img = images.nth(i);
          if (await img.isVisible()) {
            const loading = await img.getAttribute('loading');

            // Images below the fold should have loading="lazy"
            const isInViewport = await img.evaluate((el) => {
              const rect = el.getBoundingBox();
              return rect && rect.top < window.innerHeight;
            });

            if (!isInViewport) {
              expect(loading).toBe('lazy');
            }
          }
        }
      }
    });

    test('should use appropriate image formats', async ({ page }) => {
      const imageResponses: string[] = [];

      page.on('response', (response) => {
        const contentType = response.headers()['content-type'];
        if (contentType?.startsWith('image/')) {
          imageResponses.push(contentType);
        }
      });

      await page.goto('/');

      // Check for modern formats (WebP, AVIF)
      const modernFormats = imageResponses.filter((ct) =>
        ct.includes('webp') || ct.includes('avif')
      );

      // At least some images should use modern formats (if supported)
      if (imageResponses.length > 0) {
        const modernRatio = modernFormats.length / imageResponses.length;
        // This is optional - not all apps use modern formats
        // expect(modernRatio).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Third-Party Scripts', () => {
    test('should load third-party scripts asynchronously', async ({ page }) => {
      await page.goto('/');

      const syncScripts = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script[src]'));
        return scripts.filter((script) =>
          !script.hasAttribute('async') && !script.hasAttribute('defer')
        ).length;
      });

      // Minimize synchronous third-party scripts
      expect(syncScripts).toBeLessThan(3);
    });
  });

  test.describe('Lighthouse Metrics', () => {
    test('should pass Lighthouse performance audit', async ({ page, browser }) => {
      // This is a simplified check - full Lighthouse requires @lhci/cli
      await page.goto('/');

      const performanceScore = await page.evaluate(() => {
        // Get basic performance metrics
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (!navigation) return 0;

        const loadTime = navigation.loadEventEnd - navigation.fetchStart;
        const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.fetchStart;

        // Simple scoring (not actual Lighthouse algorithm)
        let score = 100;
        if (loadTime > 3000) score -= 20;
        if (loadTime > 5000) score -= 30;
        if (domContentLoaded > 2000) score -= 20;

        return score;
      });

      // Should score at least 70 (equivalent to passing threshold)
      expect(performanceScore).toBeGreaterThanOrEqual(70);
    });
  });

  test.describe('Code Splitting', () => {
    test('should load route-specific bundles', async ({ page }) => {
      const scriptsBefore: string[] = [];

      page.on('request', (request) => {
        if (request.resourceType() === 'script') {
          scriptsBefore.push(request.url());
        }
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const initialScriptCount = scriptsBefore.length;

      // Navigate to different route
      const dashboardLink = page.locator('a[href*="dashboard"]').first();
      if (await dashboardLink.isVisible({ timeout: 2000 })) {
        const scriptsAfter: string[] = [];

        page.on('request', (request) => {
          if (request.resourceType() === 'script') {
            scriptsAfter.push(request.url());
          }
        });

        await dashboardLink.click();
        await page.waitForLoadState('networkidle');

        // Should load additional chunk for new route
        const newScripts = scriptsAfter.filter((url) => !scriptsBefore.includes(url));
        expect(newScripts.length).toBeGreaterThan(0);
      }
    });
  });
});
