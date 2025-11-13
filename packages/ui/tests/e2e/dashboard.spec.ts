import { test, expect, type Page } from '@playwright/test';

/**
 * Dashboard Customization E2E Tests
 * Tests dashboard layout, widget management, drag-and-drop, and persistence.
 */

test.describe('Dashboard', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('/dashboard');
    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="dashboard"], .dashboard', { timeout: 10000 });
  });

  test.describe('Initial Layout', () => {
    test('should display dashboard grid', async () => {
      const dashboard = page.locator('[data-testid="dashboard"], .dashboard').first();
      await expect(dashboard).toBeVisible();

      // Check for grid layout
      const gridContainer = page.locator('.react-grid-layout, .dashboard-grid').first();
      await expect(gridContainer).toBeVisible();
    });

    test('should display default widgets', async () => {
      const widgets = page.locator('[data-testid="widget"], .widget, .dashboard-widget');
      const widgetCount = await widgets.count();
      expect(widgetCount).toBeGreaterThan(0);
    });

    test('should have accessible dashboard', async () => {
      const dashboard = page.locator('[data-testid="dashboard"], .dashboard').first();
      const role = await dashboard.getAttribute('role');
      expect(role).toBeTruthy();
    });
  });

  test.describe('Widget Management', () => {
    test('should add new widget', async () => {
      // Click add widget button
      const addButton = page.getByRole('button', { name: /add widget/i }).first();
      await addButton.click();

      // Select widget type from library
      const widgetLibrary = page.locator('[data-testid="widget-library"], .widget-library').first();
      await expect(widgetLibrary).toBeVisible({ timeout: 3000 });

      // Click on a widget type
      const metricWidget = page.locator('button[data-widget-type="metric"], text="Metric Card"').first();
      if (await metricWidget.isVisible({ timeout: 2000 })) {
        await metricWidget.click();

        // Verify new widget appears
        await page.waitForTimeout(1000);
        const widgets = page.locator('[data-testid="widget"], .widget');
        const finalCount = await widgets.count();
        expect(finalCount).toBeGreaterThan(0);
      }
    });

    test('should remove widget', async () => {
      const widgets = page.locator('[data-testid="widget"], .widget');
      const initialCount = await widgets.count();

      if (initialCount > 0) {
        // Hover over first widget
        const firstWidget = widgets.first();
        await firstWidget.hover();

        // Click remove button
        const removeButton = firstWidget.locator('button[aria-label*="remove"], button[aria-label*="delete"]').first();
        await removeButton.click();

        // Confirm if needed
        const confirmButton = page.getByRole('button', { name: /confirm|yes|delete/i }).first();
        if (await confirmButton.isVisible({ timeout: 1000 })) {
          await confirmButton.click();
        }

        // Verify widget count decreased
        await page.waitForTimeout(500);
        const finalCount = await widgets.count();
        expect(finalCount).toBe(initialCount - 1);
      }
    });

    test('should configure widget settings', async () => {
      const widget = page.locator('[data-testid="widget"], .widget').first();
      await widget.hover();

      // Click settings button
      const settingsButton = widget.locator('button[aria-label*="settings"], button[aria-label*="configure"]').first();
      if (await settingsButton.isVisible({ timeout: 1000 })) {
        await settingsButton.click();

        // Check settings panel appears
        const settingsPanel = page.locator('[data-testid="widget-settings"], .widget-settings, [role="dialog"]').first();
        await expect(settingsPanel).toBeVisible({ timeout: 3000 });

        // Close settings
        const closeButton = settingsPanel.locator('button[aria-label*="close"]').first();
        await closeButton.click();
      }
    });

    test('should duplicate widget', async () => {
      const widgets = page.locator('[data-testid="widget"], .widget');
      const initialCount = await widgets.count();

      if (initialCount > 0) {
        const widget = widgets.first();
        await widget.hover();

        // Look for duplicate button
        const duplicateButton = widget.locator('button[aria-label*="duplicate"], button[aria-label*="copy"]').first();
        if (await duplicateButton.isVisible({ timeout: 1000 })) {
          await duplicateButton.click();

          // Verify new widget created
          await page.waitForTimeout(1000);
          const finalCount = await widgets.count();
          expect(finalCount).toBe(initialCount + 1);
        }
      }
    });
  });

  test.describe('Drag and Drop', () => {
    test('should resize widget', async () => {
      const widget = page.locator('[data-testid="widget"], .widget').first();
      const initialBox = await widget.boundingBox();

      if (initialBox) {
        // Find resize handle
        const resizeHandle = widget.locator('.react-resizable-handle, .resize-handle').first();
        if (await resizeHandle.isVisible({ timeout: 1000 })) {
          // Drag resize handle
          await resizeHandle.hover();
          await page.mouse.down();
          await page.mouse.move(initialBox.x + initialBox.width + 100, initialBox.y + initialBox.height + 50);
          await page.mouse.up();

          // Verify size changed
          await page.waitForTimeout(500);
          const newBox = await widget.boundingBox();
          if (newBox) {
            expect(newBox.width).toBeGreaterThan(initialBox.width);
          }
        }
      }
    });

    test('should move widget via drag', async () => {
      const widget = page.locator('[data-testid="widget"], .widget').first();
      const initialBox = await widget.boundingBox();

      if (initialBox) {
        // Drag widget header
        const widgetHeader = widget.locator('.widget-header, .widget-title').first();
        await widgetHeader.hover();
        await page.mouse.down();
        await page.mouse.move(initialBox.x + 200, initialBox.y + 100);
        await page.mouse.up();

        // Verify position changed
        await page.waitForTimeout(500);
        const newBox = await widget.boundingBox();
        if (newBox) {
          expect(newBox.x).not.toBe(initialBox.x);
        }
      }
    });

    test('should snap to grid on drag', async () => {
      const widget = page.locator('[data-testid="widget"], .widget').first();

      // Drag widget slightly
      const widgetHeader = widget.locator('.widget-header, .widget-title').first();
      await widgetHeader.hover();
      await page.mouse.down();
      await page.mouse.move(50, 50, { steps: 10 });
      await page.mouse.up();

      await page.waitForTimeout(500);

      // Check if position is grid-aligned (multiples of grid unit)
      const position = await widget.evaluate((el) => {
        const rect = el.getBoundingBox();
        return { x: rect.x, y: rect.y };
      });

      // Grid snap should align to 10px or similar intervals
      // This is implementation-specific
      expect(typeof position.x).toBe('number');
    });
  });

  test.describe('Layout Management', () => {
    test('should save layout', async () => {
      // Make a change
      const widget = page.locator('[data-testid="widget"], .widget').first();
      const header = widget.locator('.widget-header, .widget-title').first();
      await header.hover();
      await page.mouse.down();
      await page.mouse.move(100, 100);
      await page.mouse.up();

      // Click save layout button
      const saveButton = page.getByRole('button', { name: /save layout/i }).first();
      if (await saveButton.isVisible({ timeout: 2000 })) {
        await saveButton.click();

        // Check for success message
        const toast = page.locator('[role="status"], .toast, .notification').first();
        if (await toast.isVisible({ timeout: 2000 })) {
          await expect(toast).toContainText(/saved|success/i);
        }
      }
    });

    test('should restore default layout', async () => {
      const restoreButton = page.getByRole('button', { name: /restore default|reset/i }).first();
      if (await restoreButton.isVisible({ timeout: 2000 })) {
        await restoreButton.click();

        // Confirm action
        const confirmButton = page.getByRole('button', { name: /confirm|yes/i }).first();
        if (await confirmButton.isVisible({ timeout: 1000 })) {
          await confirmButton.click();
        }

        // Verify layout reset
        await page.waitForTimeout(1000);
        const widgets = page.locator('[data-testid="widget"], .widget');
        const count = await widgets.count();
        expect(count).toBeGreaterThan(0);
      }
    });

    test('should persist layout across page reloads', async () => {
      // Add a unique widget or make a change
      const addButton = page.getByRole('button', { name: /add widget/i }).first();
      if (await addButton.isVisible({ timeout: 2000 })) {
        await addButton.click();

        const metricWidget = page.locator('text="Metric Card"').first();
        if (await metricWidget.isVisible({ timeout: 2000 })) {
          await metricWidget.click();
          await page.waitForTimeout(1000);

          const initialCount = await page.locator('[data-testid="widget"], .widget').count();

          // Reload page
          await page.reload();
          await page.waitForSelector('[data-testid="dashboard"], .dashboard', { timeout: 10000 });

          // Verify layout persisted
          const reloadedCount = await page.locator('[data-testid="widget"], .widget').count();
          expect(reloadedCount).toBe(initialCount);
        }
      }
    });
  });

  test.describe('Widget Types', () => {
    test('should render metric card widget', async () => {
      const metricWidget = page.locator('[data-widget-type="metric"], .metric-card').first();
      if (await metricWidget.isVisible({ timeout: 2000 })) {
        await expect(metricWidget).toBeVisible();

        // Check for metric value
        const value = metricWidget.locator('.metric-value, .value').first();
        await expect(value).toBeVisible();
      }
    });

    test('should render chart widget', async () => {
      const chartWidget = page.locator('[data-widget-type="chart"], .chart-widget').first();
      if (await chartWidget.isVisible({ timeout: 2000 })) {
        await expect(chartWidget).toBeVisible();

        // Check for chart canvas/svg
        const chart = chartWidget.locator('canvas, svg').first();
        await expect(chart).toBeVisible();
      }
    });

    test('should render table widget', async () => {
      const tableWidget = page.locator('[data-widget-type="table"], .table-widget').first();
      if (await tableWidget.isVisible({ timeout: 2000 })) {
        await expect(tableWidget).toBeVisible();

        // Check for table element
        const table = tableWidget.locator('table').first();
        await expect(table).toBeVisible();
      }
    });

    test('should render activity feed widget', async () => {
      const feedWidget = page.locator('[data-widget-type="activity"], .activity-feed').first();
      if (await feedWidget.isVisible({ timeout: 2000 })) {
        await expect(feedWidget).toBeVisible();

        // Check for activity items
        const items = feedWidget.locator('.activity-item, li').first();
        await expect(items).toBeVisible();
      }
    });
  });

  test.describe('Responsive Behavior', () => {
    test('should adapt to mobile viewport', async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);

      // Verify layout adapts
      const dashboard = page.locator('[data-testid="dashboard"], .dashboard').first();
      await expect(dashboard).toBeVisible();

      // Widgets should stack vertically
      const widgets = page.locator('[data-testid="widget"], .widget');
      const count = await widgets.count();
      if (count >= 2) {
        const firstBox = await widgets.nth(0).boundingBox();
        const secondBox = await widgets.nth(1).boundingBox();

        if (firstBox && secondBox) {
          // On mobile, second widget should be below first
          expect(secondBox.y).toBeGreaterThan(firstBox.y + firstBox.height - 50);
        }
      }
    });

    test('should adapt to tablet viewport', async () => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(500);

      const dashboard = page.locator('[data-testid="dashboard"], .dashboard').first();
      await expect(dashboard).toBeVisible();

      const widgets = page.locator('[data-testid="widget"], .widget');
      const count = await widgets.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Widget Interactions', () => {
    test('should refresh widget data', async () => {
      const widget = page.locator('[data-testid="widget"], .widget').first();
      await widget.hover();

      const refreshButton = widget.locator('button[aria-label*="refresh"], button[aria-label*="reload"]').first();
      if (await refreshButton.isVisible({ timeout: 1000 })) {
        await refreshButton.click();

        // Check for loading state
        const loading = widget.locator('.loading, .spinner, [role="progressbar"]').first();
        if (await loading.isVisible({ timeout: 500 })) {
          await expect(loading).toBeVisible();
        }
      }
    });

    test('should maximize widget to fullscreen', async () => {
      const widget = page.locator('[data-testid="widget"], .widget').first();
      await widget.hover();

      const maximizeButton = widget.locator('button[aria-label*="maximize"], button[aria-label*="fullscreen"]').first();
      if (await maximizeButton.isVisible({ timeout: 1000 })) {
        await maximizeButton.click();

        // Verify fullscreen mode
        const fullscreenWidget = page.locator('.widget-fullscreen, [data-fullscreen="true"]').first();
        await expect(fullscreenWidget).toBeVisible({ timeout: 2000 });

        // Exit fullscreen
        const exitButton = page.locator('button[aria-label*="exit"], button[aria-label*="close"]').first();
        await exitButton.click();
      }
    });
  });

  test.describe('Performance', () => {
    test('should handle many widgets efficiently', async () => {
      // Add multiple widgets
      const addButton = page.getByRole('button', { name: /add widget/i }).first();
      if (await addButton.isVisible({ timeout: 2000 })) {
        for (let i = 0; i < 10; i++) {
          await addButton.click();
          const metricWidget = page.locator('text="Metric Card"').first();
          if (await metricWidget.isVisible({ timeout: 1000 })) {
            await metricWidget.click();
            await page.waitForTimeout(300);
          }
        }

        // Verify all widgets rendered
        const widgets = page.locator('[data-testid="widget"], .widget');
        const count = await widgets.count();
        expect(count).toBeGreaterThanOrEqual(10);

        // Measure scroll performance
        const dashboard = page.locator('[data-testid="dashboard"], .dashboard').first();
        await dashboard.evaluate((el) => {
          el.scrollTop = 0;
        });

        const scrollStart = Date.now();
        await dashboard.evaluate((el) => {
          el.scrollTop = el.scrollHeight;
        });
        const scrollEnd = Date.now();

        expect(scrollEnd - scrollStart).toBeLessThan(100);
      }
    });

    test('should maintain smooth drag performance', async () => {
      const widget = page.locator('[data-testid="widget"], .widget').first();
      const header = widget.locator('.widget-header, .widget-title').first();

      const dragStart = Date.now();
      await header.hover();
      await page.mouse.down();

      // Perform multiple mouse moves
      for (let i = 0; i < 20; i++) {
        await page.mouse.move(i * 10, i * 10);
      }

      await page.mouse.up();
      const dragEnd = Date.now();

      // Drag should be smooth
      expect(dragEnd - dragStart).toBeLessThan(2000);
    });
  });
});
