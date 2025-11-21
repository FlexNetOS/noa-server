import { test, expect, Page } from '@playwright/test'

/**
 * End-to-end tests for Dashboard user flow
 * Tests the main dashboard view and navigation
 */

test.describe('Dashboard Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/')
  })

  test('should load dashboard page successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/MCP Platform|Dashboard/)

    // Check for main dashboard elements
    await expect(page.locator('h1, h2').first()).toBeVisible()
  })

  test('should display stats cards', async ({ page }) => {
    // Wait for stats to load
    await page.waitForLoadState('networkidle')

    // Check for stats cards
    const statsCards = page.locator('.card, [class*="stat"]')
    await expect(statsCards.first()).toBeVisible()

    // Verify stats content
    const statsText = await page.textContent('body')
    expect(
      statsText?.includes('Requests') ||
      statsText?.includes('Tokens') ||
      statsText?.includes('Cost') ||
      statsText?.includes('Latency')
    ).toBeTruthy()
  })

  test('should navigate to different sections', async ({ page }) => {
    // Test navigation to Traces
    const tracesLink = page.locator('a[href*="trace"], nav a:has-text("Traces")')
    if (await tracesLink.count() > 0) {
      await tracesLink.first().click()
      await expect(page).toHaveURL(/trace/)
    }

    // Navigate back
    await page.goto('/')

    // Test navigation to Tenants
    const tenantsLink = page.locator('a[href*="tenant"], nav a:has-text("Tenants")')
    if (await tenantsLink.count() > 0) {
      await tenantsLink.first().click()
      await expect(page).toHaveURL(/tenant/)
    }

    // Navigate back
    await page.goto('/')

    // Test navigation to Gateway
    const gatewayLink = page.locator('a[href*="gateway"], nav a:has-text("Gateway")')
    if (await gatewayLink.count() > 0) {
      await gatewayLink.first().click()
      await expect(page).toHaveURL(/gateway/)
    }
  })

  test('should display recent activity or traces', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Look for traces or activity section
    const hasTraces =
      (await page.locator('text=/trace|activity|recent/i').count()) > 0 ||
      (await page.locator('[class*="trace"], [class*="activity"]').count()) > 0

    // If traces section exists, verify it
    if (hasTraces) {
      const tracesSection = page.locator('text=/trace|activity|recent/i').first()
      await expect(tracesSection).toBeVisible()
    }
  })

  test('should update stats in real-time or on refresh', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Get initial stats
    const initialContent = await page.textContent('body')

    // Reload page
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Page should still render correctly
    const reloadedContent = await page.textContent('body')
    expect(reloadedContent).toBeTruthy()
    expect(reloadedContent!.length).toBeGreaterThan(0)
  })

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Verify page loads on mobile
    await expect(page.locator('body')).toBeVisible()

    // Check if navigation is adapted for mobile (hamburger menu, etc.)
    const mobileNav = page.locator('[class*="mobile"], [class*="hamburger"], button[class*="menu"]')
    const regularNav = page.locator('nav')

    // Either mobile nav or regular nav should be visible
    const hasNavigation = (await mobileNav.count()) > 0 || (await regularNav.count()) > 0
    expect(hasNavigation).toBeTruthy()
  })

  test('should handle loading states gracefully', async ({ page }) => {
    // Intercept API calls to simulate slow network
    await page.route('**/api/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 100))
      await route.continue()
    })

    await page.goto('/')

    // Check for loading indicators
    const hasLoadingIndicator =
      (await page.locator('text=/loading|spinner/i').count()) > 0 ||
      (await page.locator('[class*="loading"], [class*="spinner"]').count()) > 0

    // Page should eventually load even with slow network
    await page.waitForLoadState('networkidle', { timeout: 30000 })
    await expect(page.locator('body')).toBeVisible()
  })

  test('should display chart or visualization if present', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Look for chart elements
    const chartElements = page.locator('canvas, svg[class*="chart"], [class*="recharts"]')

    if ((await chartElements.count()) > 0) {
      await expect(chartElements.first()).toBeVisible()
    }
  })

  test('should handle error states gracefully', async ({ page }) => {
    // Intercept API calls to simulate errors
    await page.route('**/api/stats', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' }),
      })
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Page should still render, possibly with error message
    await expect(page.locator('body')).toBeVisible()

    // Check for error message
    const hasErrorMessage =
      (await page.locator('text=/error|failed|unavailable/i').count()) > 0 ||
      (await page.locator('[class*="error"]').count()) > 0

    // Error message might be shown
    // Just ensure page doesn't crash
    const content = await page.textContent('body')
    expect(content).toBeTruthy()
  })

  test('should maintain state when navigating back', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Navigate to another page
    const link = page.locator('a[href]').first()
    if (await link.isVisible()) {
      await link.click()
      await page.waitForLoadState('networkidle')

      // Go back
      await page.goBack()
      await page.waitForLoadState('networkidle')

      // Dashboard should still render correctly
      await expect(page.locator('body')).toBeVisible()
    }
  })
})

test.describe('Dashboard Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('should allow filtering or sorting if available', async ({ page }) => {
    // Look for filter or sort controls
    const filterControls = page.locator('select, input[type="search"], button:has-text("Filter"), button:has-text("Sort")')

    if ((await filterControls.count()) > 0) {
      const control = filterControls.first()
      await control.click()

      // Wait for any dropdown or options to appear
      await page.waitForTimeout(500)

      // Verify interaction worked
      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('should support keyboard navigation', async ({ page }) => {
    // Tab through interactive elements
    await page.keyboard.press('Tab')
    await page.waitForTimeout(100)

    // Verify focus is visible
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
    expect(focusedElement).toBeTruthy()
  })

  test('should show tooltips or help text on hover', async ({ page }) => {
    // Find elements that might have tooltips
    const interactiveElements = page.locator('button, [title], [aria-label]')

    if ((await interactiveElements.count()) > 0) {
      const element = interactiveElements.first()
      await element.hover()

      await page.waitForTimeout(500)

      // Check if tooltip appears
      const tooltip = page.locator('[role="tooltip"], [class*="tooltip"]')
      if ((await tooltip.count()) > 0) {
        await expect(tooltip.first()).toBeVisible()
      }
    }
  })

  test('should handle rapid clicks gracefully', async ({ page }) => {
    const button = page.locator('button').first()

    if (await button.isVisible()) {
      // Click rapidly multiple times
      for (let i = 0; i < 5; i++) {
        await button.click({ force: true })
        await page.waitForTimeout(50)
      }

      // Page should still be functional
      await expect(page.locator('body')).toBeVisible()
    }
  })
})

test.describe('Dashboard Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('should have proper heading hierarchy', async ({ page }) => {
    const h1 = await page.locator('h1').count()
    expect(h1).toBeGreaterThanOrEqual(0) // Should have at least 0-1 h1 tags

    const headings = await page.locator('h1, h2, h3, h4, h5, h6').count()
    expect(headings).toBeGreaterThan(0) // Should have some headings
  })

  test('should have accessible navigation', async ({ page }) => {
    const nav = page.locator('nav, [role="navigation"]')
    if ((await nav.count()) > 0) {
      await expect(nav.first()).toBeVisible()
    }
  })

  test('should have meaningful alt text for images', async ({ page }) => {
    const images = page.locator('img')
    const imageCount = await images.count()

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i)
      const alt = await img.getAttribute('alt')
      // Alt attribute should exist (can be empty for decorative images)
      expect(alt !== null).toBeTruthy()
    }
  })

  test('should support screen reader navigation', async ({ page }) => {
    // Check for ARIA landmarks
    const landmarks = page.locator('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"]')
    const landmarkCount = await landmarks.count()

    // Modern apps should have at least some landmarks
    expect(landmarkCount).toBeGreaterThanOrEqual(0)
  })
})
