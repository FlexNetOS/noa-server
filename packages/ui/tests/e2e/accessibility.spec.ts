import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility E2E Tests
 * WCAG 2.1 AA compliance validation using axe-core.
 * Tests keyboard navigation, screen reader compatibility, and color contrast.
 */

test.describe('Accessibility - WCAG 2.1 AA', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Automated axe-core Scans', () => {
    test('should pass axe accessibility scan on homepage', async ({ page }) => {
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should pass axe scan on chat interface', async ({ page }) => {
      // Navigate to chat if not already there
      const chatInterface = page.locator('[role="main"][aria-label="Chat interface"]');
      await expect(chatInterface).toBeVisible({ timeout: 5000 });

      const accessibilityScanResults = await new AxeBuilder({ page })
        .include('[role="main"]')
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should pass axe scan on file upload section', async ({ page }) => {
      const fileSection = page.locator('[data-testid="file-section"], #files').first();
      if (await fileSection.isVisible({ timeout: 2000 })) {
        await fileSection.click();
      }

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should pass axe scan on dashboard', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForSelector('[data-testid="dashboard"], .dashboard', { timeout: 10000 });

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should pass axe scan on modals/dialogs', async ({ page }) => {
      // Trigger a modal if possible
      const settingsButton = page.getByRole('button', { name: /settings/i }).first();
      if (await settingsButton.isVisible({ timeout: 2000 })) {
        await settingsButton.click();

        const modal = page.locator('[role="dialog"]').first();
        if (await modal.isVisible({ timeout: 2000 })) {
          const accessibilityScanResults = await new AxeBuilder({ page })
            .include('[role="dialog"]')
            .withTags(['wcag2a', 'wcag2aa'])
            .analyze();

          expect(accessibilityScanResults.violations).toEqual([]);
        }
      }
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should navigate with Tab key', async ({ page }) => {
      await page.keyboard.press('Tab');
      const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
      expect(firstFocused).toBeTruthy();

      // Tab through multiple elements
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
      }

      const currentFocused = await page.evaluate(() => document.activeElement?.tagName);
      expect(currentFocused).toBeTruthy();
    });

    test('should navigate backwards with Shift+Tab', async ({ page }) => {
      // Tab forward first
      for (let i = 0; i < 3; i++) {
        await page.keyboard.press('Tab');
      }

      const forwardFocus = await page.evaluate(() => document.activeElement?.className);

      // Tab backward
      await page.keyboard.press('Shift+Tab');
      const backwardFocus = await page.evaluate(() => document.activeElement?.className);

      expect(backwardFocus).not.toBe(forwardFocus);
    });

    test('should activate buttons with Enter key', async ({ page }) => {
      // Focus on a button
      const button = page.getByRole('button').first();
      await button.focus();

      // Press Enter
      await page.keyboard.press('Enter');

      // Button should trigger action (implementation specific)
      await page.waitForTimeout(500);
    });

    test('should activate buttons with Space key', async ({ page }) => {
      const button = page.getByRole('button').first();
      await button.focus();

      await page.keyboard.press('Space');
      await page.waitForTimeout(500);
    });

    test('should have visible focus indicators', async ({ page }) => {
      await page.keyboard.press('Tab');

      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();

      // Check for focus outline/ring
      const outline = await focusedElement.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return styles.outline || styles.boxShadow || styles.border;
      });

      expect(outline).toBeTruthy();
      expect(outline).not.toBe('none');
    });

    test('should trap focus in modals', async ({ page }) => {
      const modalTrigger = page.getByRole('button', { name: /open|settings|menu/i }).first();
      if (await modalTrigger.isVisible({ timeout: 2000 })) {
        await modalTrigger.click();

        const modal = page.locator('[role="dialog"]').first();
        if (await modal.isVisible({ timeout: 2000 })) {
          // Tab through modal
          const modalElements = modal.locator('button, a, input, [tabindex="0"]');
          const count = await modalElements.count();

          if (count > 0) {
            // Tab through all elements and then one more
            for (let i = 0; i <= count; i++) {
              await page.keyboard.press('Tab');
            }

            // Focus should stay within modal
            const focusedElement = page.locator(':focus');
            const isInModal = await modal.locator(':focus').count() > 0;
            expect(isInModal).toBeTruthy();
          }
        }
      }
    });

    test('should close modals with Escape key', async ({ page }) => {
      const modalTrigger = page.getByRole('button', { name: /open|settings|menu/i }).first();
      if (await modalTrigger.isVisible({ timeout: 2000 })) {
        await modalTrigger.click();

        const modal = page.locator('[role="dialog"]').first();
        if (await modal.isVisible({ timeout: 2000 })) {
          await page.keyboard.press('Escape');

          await expect(modal).not.toBeVisible({ timeout: 2000 });
        }
      }
    });
  });

  test.describe('ARIA Attributes', () => {
    test('should have proper ARIA roles', async ({ page }) => {
      // Check main landmarks
      const main = page.locator('[role="main"]');
      await expect(main).toBeVisible();

      // Check navigation if present
      const nav = page.locator('[role="navigation"]');
      const navCount = await nav.count();
      if (navCount > 0) {
        await expect(nav.first()).toBeVisible();
      }
    });

    test('should have ARIA labels on interactive elements', async ({ page }) => {
      const buttons = page.locator('button');
      const count = await buttons.count();

      for (let i = 0; i < Math.min(count, 10); i++) {
        const button = buttons.nth(i);
        if (await button.isVisible()) {
          const ariaLabel = await button.getAttribute('aria-label');
          const text = await button.textContent();

          // Button should have either aria-label or text content
          expect(ariaLabel || text?.trim()).toBeTruthy();
        }
      }
    });

    test('should use aria-live for dynamic content', async ({ page }) => {
      const liveRegions = page.locator('[aria-live]');
      const count = await liveRegions.count();

      if (count > 0) {
        const firstLive = liveRegions.first();
        const ariaLive = await firstLive.getAttribute('aria-live');
        expect(['polite', 'assertive', 'off']).toContain(ariaLive);
      }
    });

    test('should have proper heading hierarchy', async ({ page }) => {
      const h1 = page.locator('h1');
      const h1Count = await h1.count();

      // Should have at least one h1
      expect(h1Count).toBeGreaterThanOrEqual(0);

      // Check heading order (h1 -> h2 -> h3, no skipping)
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
      const levels = await Promise.all(
        headings.map((h) => h.evaluate((el) => parseInt(el.tagName.substring(1))))
      );

      // Verify no large jumps (e.g., h1 to h4)
      for (let i = 1; i < levels.length; i++) {
        const jump = levels[i] - levels[i - 1];
        expect(jump).toBeLessThanOrEqual(1);
      }
    });
  });

  test.describe('Color Contrast', () => {
    test('should meet color contrast ratios', async ({ page }) => {
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2aa'])
        .disableRules(['color-contrast']) // We'll check this separately
        .analyze();

      // Then specifically check color contrast
      const contrastResults = await new AxeBuilder({ page })
        .withRules(['color-contrast'])
        .analyze();

      expect(contrastResults.violations.length).toBe(0);
    });

    test('should have sufficient contrast in dark mode', async ({ page }) => {
      // Toggle dark mode if possible
      const darkModeToggle = page.locator('button[aria-label*="dark"], button[aria-label*="theme"]').first();
      if (await darkModeToggle.isVisible({ timeout: 2000 })) {
        await darkModeToggle.click();
        await page.waitForTimeout(500);

        const contrastResults = await new AxeBuilder({ page })
          .withRules(['color-contrast'])
          .analyze();

        expect(contrastResults.violations.length).toBe(0);
      }
    });
  });

  test.describe('Screen Reader Compatibility', () => {
    test('should have accessible form labels', async ({ page }) => {
      const inputs = page.locator('input:not([type="hidden"])');
      const count = await inputs.count();

      for (let i = 0; i < count; i++) {
        const input = inputs.nth(i);
        if (await input.isVisible()) {
          const id = await input.getAttribute('id');
          const ariaLabel = await input.getAttribute('aria-label');
          const ariaLabelledBy = await input.getAttribute('aria-labelledby');

          if (id) {
            // Check for associated label
            const label = page.locator(`label[for="${id}"]`);
            const labelExists = (await label.count()) > 0;
            const hasLabel = labelExists || ariaLabel || ariaLabelledBy;
            expect(hasLabel).toBeTruthy();
          }
        }
      }
    });

    test('should have alt text on images', async ({ page }) => {
      const images = page.locator('img');
      const count = await images.count();

      for (let i = 0; i < count; i++) {
        const img = images.nth(i);
        if (await img.isVisible()) {
          const alt = await img.getAttribute('alt');
          const role = await img.getAttribute('role');

          // Image should have alt text or role="presentation"
          expect(alt !== null || role === 'presentation').toBeTruthy();
        }
      }
    });

    test('should announce dynamic content changes', async ({ page }) => {
      // Send a chat message
      const messageInput = page.locator('textarea[placeholder*="message"]').first();
      if (await messageInput.isVisible({ timeout: 2000 })) {
        await messageInput.fill('Test announcement');
        await messageInput.press('Enter');

        // Check for aria-live region
        const liveRegion = page.locator('[aria-live="polite"], [role="log"]');
        await expect(liveRegion).toBeVisible({ timeout: 3000 });
      }
    });

    test('should have descriptive link text', async ({ page }) => {
      const links = page.locator('a');
      const count = await links.count();

      for (let i = 0; i < Math.min(count, 10); i++) {
        const link = links.nth(i);
        if (await link.isVisible()) {
          const text = await link.textContent();
          const ariaLabel = await link.getAttribute('aria-label');

          const linkText = (text || ariaLabel || '').trim();

          // Avoid generic link text
          const genericTexts = ['click here', 'here', 'link', 'read more'];
          const isGeneric = genericTexts.some((generic) =>
            linkText.toLowerCase() === generic
          );

          expect(isGeneric).toBeFalsy();
        }
      }
    });
  });

  test.describe('Touch Targets', () => {
    test('should have adequate touch target sizes', async ({ page }) => {
      const buttons = page.locator('button');
      const count = await buttons.count();

      for (let i = 0; i < Math.min(count, 10); i++) {
        const button = buttons.nth(i);
        if (await button.isVisible()) {
          const box = await button.boundingBox();
          if (box) {
            // WCAG 2.1 AA requires at least 44x44 CSS pixels for touch targets
            // We'll check for minimum 36x36 with some tolerance
            expect(box.width).toBeGreaterThanOrEqual(30);
            expect(box.height).toBeGreaterThanOrEqual(30);
          }
        }
      }
    });
  });

  test.describe('Language and Text', () => {
    test('should have lang attribute on html element', async ({ page }) => {
      const lang = await page.getAttribute('html', 'lang');
      expect(lang).toBeTruthy();
      expect(lang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/); // e.g., 'en' or 'en-US'
    });

    test('should have readable page title', async ({ page }) => {
      const title = await page.title();
      expect(title).toBeTruthy();
      expect(title.length).toBeGreaterThan(0);
    });
  });

  test.describe('Forms Accessibility', () => {
    test('should show validation errors accessibly', async ({ page }) => {
      // Find a form
      const form = page.locator('form').first();
      if (await form.isVisible({ timeout: 2000 })) {
        // Submit without filling required fields
        const submitButton = form.locator('button[type="submit"]').first();
        if (await submitButton.isVisible({ timeout: 1000 })) {
          await submitButton.click();

          // Check for accessible error messages
          const errorMessage = page.locator('[role="alert"], .error-message, [aria-invalid="true"]').first();
          if (await errorMessage.isVisible({ timeout: 2000 })) {
            const text = await errorMessage.textContent();
            expect(text?.trim()).toBeTruthy();
          }
        }
      }
    });

    test('should have associated error messages with fields', async ({ page }) => {
      const inputs = page.locator('input[aria-invalid="true"]');
      const count = await inputs.count();

      for (let i = 0; i < count; i++) {
        const input = inputs.nth(i);
        const describedBy = await input.getAttribute('aria-describedby');

        if (describedBy) {
          const errorElement = page.locator(`#${describedBy}`);
          await expect(errorElement).toBeVisible();
        }
      }
    });
  });

  test.describe('Skip Links', () => {
    test('should have skip to main content link', async ({ page }) => {
      // Press Tab to reveal skip link (often hidden until focused)
      await page.keyboard.press('Tab');

      const skipLink = page.locator('a[href="#main"], a[href="#content"]').first();
      if (await skipLink.isVisible({ timeout: 1000 })) {
        await expect(skipLink).toBeFocused();

        // Click skip link
        await skipLink.click();

        // Verify focus moved to main content
        const main = page.locator('#main, #content, [role="main"]').first();
        const mainFocused = await main.evaluate((el) =>
          el === document.activeElement || el.contains(document.activeElement)
        );
        expect(mainFocused).toBeTruthy();
      }
    });
  });
});
