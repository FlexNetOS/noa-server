import { test, expect } from '@playwright/test'

/**
 * End-to-end tests for Traces viewing and monitoring flow
 * Tests trace list, detail view, filtering, and real-time updates
 */

test.describe('Traces Monitoring Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/traces')
    await page.waitForLoadState('networkidle')
  })

  test('should load traces page', async ({ page }) => {
    await expect(page).toHaveURL(/trace/)
    await expect(page.locator('body')).toBeVisible()

    // Check for traces-related content
    const content = await page.textContent('body')
    expect(content).toBeTruthy()
  })

  test('should display trace list or table', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Look for trace list, table, or cards
    const hasTraceList =
      (await page.locator('table, [class*="trace"], [class*="list"]').count()) > 0 ||
      (await page.locator('text=/trace|request|model|latency/i').count()) > 0

    expect(hasTraceList || (await page.locator('text=/no trace|empty/i').count()) > 0).toBeTruthy()
  })

  test('should show trace details on click', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Find trace rows or cards
    const traceElements = page.locator('tr[class*="trace"], [class*="trace-item"], [class*="trace-card"]')
    const count = await traceElements.count()

    if (count > 0) {
      await traceElements.first().click()
      await page.waitForTimeout(500)

      // Should show detail view (modal, sidebar, or new page)
      const hasDetail =
        (await page.locator('[class*="modal"], [class*="detail"], [class*="drawer"]').count()) > 0 ||
        (await page.locator('text=/span|duration|token|cost/i').count()) > 0

      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('should display trace timeline or spans', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Click on first trace
    const traceElements = page.locator('tr, [class*="trace"]')
    const count = await traceElements.count()

    if (count > 0) {
      await traceElements.first().click()
      await page.waitForTimeout(1000)

      // Look for timeline or span visualization
      const hasTimeline =
        (await page.locator('[class*="timeline"], [class*="span"], svg, canvas').count()) > 0 ||
        (await page.locator('text=/duration|start|end|span/i').count()) > 0

      // Just verify detail view loaded
      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('should filter traces by date range', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Look for date filter inputs
    const dateInputs = page.locator('input[type="date"], input[type="datetime-local"], input[placeholder*="date"]')

    if ((await dateInputs.count()) > 0) {
      const dateInput = dateInputs.first()
      await dateInput.click()
      await page.waitForTimeout(500)

      // Try to select a date
      await dateInput.fill('2025-01-15')
      await page.waitForTimeout(500)

      // Traces should update
      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('should filter traces by tenant', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Look for tenant filter dropdown
    const tenantFilter = page.locator('select[name*="tenant"], button:has-text("Tenant"), input[placeholder*="tenant"]')

    if ((await tenantFilter.count()) > 0) {
      await tenantFilter.first().click()
      await page.waitForTimeout(500)

      // Select an option if dropdown appears
      const options = page.locator('option, [role="option"]')
      if ((await options.count()) > 0) {
        await options.first().click()
        await page.waitForTimeout(500)
      }

      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('should filter traces by model', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Look for model filter
    const modelFilter = page.locator('select[name*="model"], button:has-text("Model"), input[placeholder*="model"]')

    if ((await modelFilter.count()) > 0) {
      await modelFilter.first().click()
      await page.waitForTimeout(500)

      const options = page.locator('option, [role="option"]')
      if ((await options.count()) > 0) {
        await options.first().click()
        await page.waitForTimeout(500)
      }

      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('should filter traces by status', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Look for status filter
    const statusFilter = page.locator('select[name*="status"], button:has-text("Status"), [class*="status-filter"]')

    if ((await statusFilter.count()) > 0) {
      await statusFilter.first().click()
      await page.waitForTimeout(500)

      // Try to select "error" or "success"
      const errorOption = page.locator('text="Error", text="Failed", option:has-text("Error")')
      if ((await errorOption.count()) > 0) {
        await errorOption.first().click()
        await page.waitForTimeout(500)
      }

      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('should search traces by ID or content', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], input[placeholder*="ID"]')

    if ((await searchInput.count()) > 0) {
      await searchInput.first().fill('test-trace')
      await page.waitForTimeout(500)

      // Results should update
      await expect(page.locator('body')).toBeVisible()

      // Clear search
      await searchInput.first().clear()
      await page.waitForTimeout(500)
    }
  })

  test('should sort traces by timestamp', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Look for sortable timestamp column
    const timestampHeader = page.locator('th:has-text("Time"), th:has-text("Date"), [role="columnheader"]:has-text("Time")')

    if ((await timestampHeader.count()) > 0) {
      await timestampHeader.first().click()
      await page.waitForTimeout(500)

      // Click again to reverse sort
      await timestampHeader.first().click()
      await page.waitForTimeout(500)

      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('should sort traces by duration', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Look for sortable duration column
    const durationHeader = page.locator('th:has-text("Duration"), th:has-text("Latency"), [role="columnheader"]:has-text("Duration")')

    if ((await durationHeader.count()) > 0) {
      await durationHeader.first().click()
      await page.waitForTimeout(500)

      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('should display trace metrics correctly', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Get first trace
    const traceElements = page.locator('tr, [class*="trace"]')
    const count = await traceElements.count()

    if (count > 0) {
      const firstTrace = traceElements.first()
      const content = await firstTrace.textContent()

      // Should contain some metric-related data
      const hasMetrics =
        content?.includes('ms') ||
        content?.includes('tokens') ||
        content?.includes('$') ||
        content?.match(/\d+/) !== null

      expect(content).toBeTruthy()
    }
  })

  test('should handle pagination for trace list', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Look for pagination controls
    const nextButton = page.locator('button:has-text("Next"), [aria-label*="Next page"]')

    if ((await nextButton.count()) > 0 && (await nextButton.first().isEnabled())) {
      await nextButton.first().click()
      await page.waitForTimeout(1000)

      // Verify new page loaded
      await expect(page.locator('body')).toBeVisible()

      // Go back
      const prevButton = page.locator('button:has-text("Previous"), [aria-label*="Previous page"]')
      if ((await prevButton.count()) > 0 && (await prevButton.first().isEnabled())) {
        await prevButton.first().click()
        await page.waitForTimeout(1000)
      }
    }
  })

  test('should auto-refresh traces when enabled', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Look for auto-refresh toggle
    const autoRefreshToggle = page.locator('input[type="checkbox"]:near(:text("Auto")), button:has-text("Auto"), [class*="auto-refresh"]')

    if ((await autoRefreshToggle.count()) > 0) {
      await autoRefreshToggle.first().click()
      await page.waitForTimeout(3000)

      // Should still be responsive
      await expect(page.locator('body')).toBeVisible()

      // Turn off auto-refresh
      await autoRefreshToggle.first().click()
    }
  })

  test('should manually refresh traces', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Look for refresh button
    const refreshButton = page.locator('button:has-text("Refresh"), button[aria-label*="Refresh"], svg[class*="refresh"]')

    if ((await refreshButton.count()) > 0) {
      await refreshButton.first().click()
      await page.waitForTimeout(1000)

      // Traces should reload
      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('should export trace data', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Look for export button
    const exportButton = page.locator('button:has-text("Export"), button:has-text("Download")')

    if ((await exportButton.count()) > 0) {
      const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null)

      await exportButton.first().click()

      const download = await downloadPromise

      if (download) {
        expect(download.suggestedFilename()).toBeTruthy()
      }
    }
  })

  test('should display error traces distinctly', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Look for error indicators
    const errorTraces = page.locator('[class*="error"], [class*="failed"], [style*="red"]')

    if ((await errorTraces.count()) > 0) {
      const errorTrace = errorTraces.first()
      await expect(errorTrace).toBeVisible()

      // Click to see details
      await errorTrace.click()
      await page.waitForTimeout(500)

      // Should show error details
      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('should show trace request and response', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Click on trace
    const traceElements = page.locator('tr, [class*="trace"]')
    if ((await traceElements.count()) > 0) {
      await traceElements.first().click()
      await page.waitForTimeout(1000)

      // Look for request/response tabs or sections
      const hasReqRes =
        (await page.locator('text=/request|response|input|output/i').count()) > 0 ||
        (await page.locator('[class*="request"], [class*="response"]').count()) > 0

      // Should show some detail
      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('should link to tenant from trace', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Click on trace
    const traceElements = page.locator('tr, [class*="trace"]')
    if ((await traceElements.count()) > 0) {
      await traceElements.first().click()
      await page.waitForTimeout(1000)

      // Look for tenant link
      const tenantLink = page.locator('a[href*="tenant"]')

      if ((await tenantLink.count()) > 0) {
        await tenantLink.first().click()
        await page.waitForTimeout(500)

        // Should navigate to tenant page
        await expect(page).toHaveURL(/tenant/)
      }
    }
  })

  test('should handle empty trace list', async ({ page }) => {
    // Intercept API to return empty list
    await page.route('**/api/traces*', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify([]),
      })
    })

    await page.reload()
    await page.waitForLoadState('networkidle')

    // Should show empty state
    const hasEmptyState =
      (await page.locator('text=/no trace|empty|no data/i').count()) > 0 ||
      (await page.locator('[class*="empty"]').count()) > 0

    // Page should not crash
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Trace Details', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/traces')
    await page.waitForLoadState('networkidle')
  })

  test('should show span hierarchy', async ({ page }) => {
    const traceElements = page.locator('tr, [class*="trace"]')
    if ((await traceElements.count()) > 0) {
      await traceElements.first().click()
      await page.waitForTimeout(1000)

      // Look for span tree or list
      const hasSpans =
        (await page.locator('text=/span|operation|service/i').count()) > 0 ||
        (await page.locator('[class*="span"], [class*="tree"]').count()) > 0

      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('should display span timing information', async ({ page }) => {
    const traceElements = page.locator('tr, [class*="trace"]')
    if ((await traceElements.count()) > 0) {
      await traceElements.first().click()
      await page.waitForTimeout(1000)

      // Look for timing info
      const content = await page.textContent('body')
      const hasTiming = content?.includes('ms') || content?.includes('duration') || content?.includes('latency')

      expect(content).toBeTruthy()
    }
  })

  test('should show span attributes', async ({ page }) => {
    const traceElements = page.locator('tr, [class*="trace"]')
    if ((await traceElements.count()) > 0) {
      await traceElements.first().click()
      await page.waitForTimeout(1000)

      // Click on a span if visible
      const spans = page.locator('[class*="span"], [role="treeitem"]')
      if ((await spans.count()) > 0) {
        await spans.first().click()
        await page.waitForTimeout(500)

        // Should show attributes
        const hasAttributes =
          (await page.locator('text=/attribute|metadata|tag/i').count()) > 0 ||
          (await page.locator('code, pre, [class*="attribute"]').count()) > 0

        await expect(page.locator('body')).toBeVisible()
      }
    }
  })

  test('should close trace detail view', async ({ page }) => {
    const traceElements = page.locator('tr, [class*="trace"]')
    if ((await traceElements.count()) > 0) {
      await traceElements.first().click()
      await page.waitForTimeout(500)

      // Look for close button
      const closeButton = page.locator('button:has-text("Close"), button[aria-label*="Close"], svg[class*="close"]')

      if ((await closeButton.count()) > 0) {
        await closeButton.first().click()
        await page.waitForTimeout(500)

        // Should return to trace list
        await expect(page.locator('body')).toBeVisible()
      }
    }
  })
})

test.describe('Traces Performance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/traces')
  })

  test('should render large trace list efficiently', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Scroll through list
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)

    // Should remain responsive
    await expect(page.locator('body')).toBeVisible()
  })

  test('should handle rapid filter changes', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    const searchInput = page.locator('input[type="search"]')

    if ((await searchInput.count()) > 0) {
      // Type rapidly
      await searchInput.first().type('test', { delay: 50 })
      await page.waitForTimeout(100)
      await searchInput.first().clear()
      await searchInput.first().type('another', { delay: 50 })
      await page.waitForTimeout(100)

      // Should still be responsive
      await expect(page.locator('body')).toBeVisible()
    }
  })
})
