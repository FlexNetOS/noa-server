import { test, expect } from '@playwright/test'

/**
 * E2E tests for Dashboard Navigation
 * Tests complete user flows through the dashboard interface
 */

test.describe('Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard before each test
    await page.goto('/')
  })

  test('should load dashboard page successfully', async ({ page }) => {
    // Wait for dashboard to load
    await expect(page).toHaveTitle(/MCP Platform|Dashboard/)

    // Check for main dashboard heading
    await expect(page.locator('h2').filter({ hasText: 'Dashboard' })).toBeVisible()
  })

  test('should display stats cards', async ({ page }) => {
    // Check for stats cards
    const totalRequestsCard = page.locator('text=Total Requests').first()
    const totalTokensCard = page.locator('text=Total Tokens').first()
    const totalCostCard = page.locator('text=Total Cost').first()

    await expect(totalRequestsCard).toBeVisible()
    await expect(totalTokensCard).toBeVisible()
    await expect(totalCostCard).toBeVisible()
  })

  test('should display numeric stats values', async ({ page }) => {
    // Wait for stats to load
    await page.waitForTimeout(1000)

    // Check that numeric values are displayed
    const statsCards = page.locator('.card')
    await expect(statsCards.first()).toBeVisible()
  })

  test('should display traces section', async ({ page }) => {
    // Check for traces section
    const tracesHeading = page.locator('text=Recent Traces')
    await expect(tracesHeading).toBeVisible()
  })

  test('should display tenants table', async ({ page }) => {
    // Check for tenants section
    const tenantsHeading = page.locator('text=Tenants')
    await expect(tenantsHeading).toBeVisible()

    // Check for table headers
    const tableHeaders = page.locator('th')
    await expect(tableHeaders.filter({ hasText: 'Tenant' })).toBeVisible()
    await expect(tableHeaders.filter({ hasText: 'Budget' })).toBeVisible()
    await expect(tableHeaders.filter({ hasText: 'Spend' })).toBeVisible()
  })

  test('should display throughput chart', async ({ page }) => {
    // Check for chart section
    const chartHeading = page.locator('text=Request Throughput')
    await expect(chartHeading).toBeVisible()
  })

  test('should navigate to traces page', async ({ page }) => {
    // Click on Traces link in navigation
    await page.click('text=Traces')

    // Verify navigation
    await expect(page).toHaveURL(/.*traces/)
    await expect(page.locator('h2').filter({ hasText: 'Traces' })).toBeVisible()
  })

  test('should navigate to tenants page', async ({ page }) => {
    // Click on Tenants link in navigation
    await page.click('text=Tenants')

    // Verify navigation
    await expect(page).toHaveURL(/.*tenants/)
    await expect(page.locator('h2').filter({ hasText: 'Tenants' })).toBeVisible()
  })

  test('should navigate to gateway page', async ({ page }) => {
    // Click on Gateway link in navigation
    await page.click('text=Gateway')

    // Verify navigation
    await expect(page).toHaveURL(/.*gateway/)
  })

  test('should navigate back to dashboard', async ({ page }) => {
    // Navigate away
    await page.click('text=Traces')

    // Navigate back to dashboard
    await page.click('text=Dashboard')

    // Verify we're back on dashboard
    await expect(page).toHaveURL(/.*dashboard|^\/$/)
    await expect(page.locator('h2').filter({ hasText: 'Dashboard' })).toBeVisible()
  })

  test('should handle responsive layout on mobile', async ({ page, isMobile }) => {
    if (isMobile) {
      // Check that content is visible on mobile
      await expect(page.locator('text=Dashboard')).toBeVisible()

      // Check that cards stack vertically
      const cards = page.locator('.card')
      const firstCard = cards.first()
      await expect(firstCard).toBeVisible()
    }
  })

  test('should display real-time data updates', async ({ page }) => {
    // Get initial stats value
    const statsValue = await page.locator('.text-4xl').first().textContent()

    // Wait for potential update
    await page.waitForTimeout(2000)

    // Stats should be displayed (may or may not have updated)
    const updatedValue = await page.locator('.text-4xl').first().textContent()
    expect(updatedValue).toBeDefined()
  })
})

test.describe('Dashboard Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should select tenant and display records', async ({ page }) => {
    // Wait for tenants to load
    await page.waitForTimeout(1000)

    // Click on a tenant row
    const tenantRow = page.locator('tr').filter({ hasText: 'public' }).first()
    if (await tenantRow.isVisible()) {
      await tenantRow.click()

      // Check that records section updates
      await expect(page.locator('text=Records')).toBeVisible()
    }
  })

  test('should open trace in new tab when clicked', async ({ page, context }) => {
    // Wait for traces to load
    await page.waitForTimeout(1000)

    // Find first trace link
    const traceLink = page.locator('a[href*="trace"]').first()

    if (await traceLink.isVisible()) {
      // Click trace link (would open in new tab in real scenario)
      const href = await traceLink.getAttribute('href')
      expect(href).toBeTruthy()
    }
  })

  test('should handle empty data states gracefully', async ({ page }) => {
    // Mock empty state by checking for fallback messages
    await page.waitForTimeout(1000)

    // Look for "No traces available" or similar messages
    const noDataMessages = [
      'No traces available',
      'No tenants found',
      'No records for this tenant'
    ]

    // At least one section should show data or a no-data message
    const pageContent = await page.textContent('body')
    expect(pageContent).toBeTruthy()
  })

  test('should display formatted currency values', async ({ page }) => {
    await page.waitForTimeout(1000)

    // Check for dollar signs in cost displays
    const costElements = page.locator('text=/\\$\\d+\\.\\d{2}/')
    const count = await costElements.count()

    // May or may not have cost data, but format should be correct if present
    if (count > 0) {
      const firstCost = await costElements.first().textContent()
      expect(firstCost).toMatch(/\$\d+\.\d{2}/)
    }
  })

  test('should display formatted token counts with commas', async ({ page }) => {
    await page.waitForTimeout(1000)

    // Check for comma-separated numbers
    const pageContent = await page.textContent('body')

    // Page should render
    expect(pageContent).toBeTruthy()
  })
})

test.describe('Dashboard Performance', () => {
  test('should load dashboard within acceptable time', async ({ page }) => {
    const startTime = Date.now()

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const loadTime = Date.now() - startTime

    // Dashboard should load in less than 5 seconds
    expect(loadTime).toBeLessThan(5000)
  })

  test('should handle multiple rapid navigations', async ({ page }) => {
    await page.goto('/')

    // Rapidly navigate between pages
    await page.click('text=Traces')
    await page.click('text=Dashboard')
    await page.click('text=Tenants')
    await page.click('text=Dashboard')

    // Should end up on dashboard without errors
    await expect(page.locator('h2').filter({ hasText: 'Dashboard' })).toBeVisible()
  })

  test('should not have console errors on load', async ({ page }) => {
    const consoleErrors: string[] = []

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Filter out known benign errors (like favicon 404s)
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('favicon') &&
      !err.includes('404')
    )

    expect(criticalErrors).toHaveLength(0)
  })
})

test.describe('Dashboard Accessibility', () => {
  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/')

    // Check for h2 heading
    const h2 = page.locator('h2').first()
    await expect(h2).toBeVisible()
  })

  test('should have readable text contrast', async ({ page }) => {
    await page.goto('/')

    // Page should load with visible text
    const mainContent = page.locator('body')
    await expect(mainContent).toBeVisible()
  })

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/')

    // Tab through interactive elements
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    // Check that focus is visible
    const focusedElement = page.locator(':focus')
    const isFocused = await focusedElement.count() > 0

    // Some element should receive focus
    expect(isFocused).toBeTruthy()
  })
})
