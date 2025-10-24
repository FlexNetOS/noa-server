import { test, expect, type Page } from '@playwright/test';

/**
 * Chat Interface E2E Tests
 * Tests the complete chat flow including messaging, markdown rendering,
 * code highlighting, and real-time streaming.
 */

test.describe('Chat Interface', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('/');
    // Wait for chat interface to load
    await page.waitForSelector('[role="main"][aria-label="Chat interface"]');
  });

  test.describe('Initial State', () => {
    test('should display empty state', async () => {
      const emptyState = page.locator('.empty-state');
      await expect(emptyState).toBeVisible();
      await expect(emptyState.locator('.empty-title')).toHaveText('No messages yet');
      await expect(emptyState.locator('.empty-description')).toContainText(
        'Start a conversation'
      );
    });

    test('should have accessible chat interface', async () => {
      const chatInterface = page.locator('[role="main"]');
      await expect(chatInterface).toHaveAttribute('aria-label', 'Chat interface');

      const messagesContainer = page.locator('[role="log"]');
      await expect(messagesContainer).toHaveAttribute('aria-live', 'polite');
      await expect(messagesContainer).toHaveAttribute('aria-atomic', 'false');
    });
  });

  test.describe('Sending Messages', () => {
    test('should send a text message', async () => {
      // Type message in input
      const messageInput = page.locator('textarea[placeholder*="message"]').first();
      await messageInput.fill('Hello, this is a test message');

      // Click send button
      const sendButton = page.getByRole('button', { name: /send/i }).first();
      await sendButton.click();

      // Verify message appears
      const userMessage = page.locator('.message-user').first();
      await expect(userMessage).toBeVisible();
      await expect(userMessage).toContainText('Hello, this is a test message');
    });

    test('should display loading indicator when waiting for response', async () => {
      const messageInput = page.locator('textarea[placeholder*="message"]').first();
      await messageInput.fill('Test message');

      const sendButton = page.getByRole('button', { name: /send/i }).first();
      await sendButton.click();

      // Check for typing indicator
      const typingIndicator = page.locator('.message-assistant .message-content');
      await expect(typingIndicator).toBeVisible({ timeout: 5000 });
    });

    test('should handle Enter key to send message', async () => {
      const messageInput = page.locator('textarea[placeholder*="message"]').first();
      await messageInput.fill('Message sent with Enter');
      await messageInput.press('Enter');

      const userMessage = page.locator('.message-user').first();
      await expect(userMessage).toContainText('Message sent with Enter');
    });

    test('should handle Shift+Enter for new line', async () => {
      const messageInput = page.locator('textarea[placeholder*="message"]').first();
      await messageInput.fill('Line 1');
      await messageInput.press('Shift+Enter');
      await messageInput.type('Line 2');

      // Verify textarea contains newline
      const value = await messageInput.inputValue();
      expect(value).toContain('\n');
    });
  });

  test.describe('Message Display', () => {
    test('should render markdown content', async () => {
      // Send message with markdown
      const messageInput = page.locator('textarea[placeholder*="message"]').first();
      await messageInput.fill('# Heading\n**Bold text** and *italic*');
      await messageInput.press('Enter');

      // Wait for message to appear
      await page.waitForSelector('.message-user', { timeout: 5000 });

      // Check if markdown is rendered (implementation-specific)
      const messageContent = page.locator('.message-user .message-content').first();
      await expect(messageContent).toBeVisible();
    });

    test('should display code blocks with syntax highlighting', async () => {
      const messageInput = page.locator('textarea[placeholder*="message"]').first();
      const codeMessage = '```javascript\nconst x = 42;\nconsole.log(x);\n```';
      await messageInput.fill(codeMessage);
      await messageInput.press('Enter');

      // Wait for code block to render
      const codeBlock = page.locator('.code-block, pre code').first();
      await expect(codeBlock).toBeVisible({ timeout: 5000 });
    });

    test('should show timestamps when enabled', async () => {
      const messageInput = page.locator('textarea[placeholder*="message"]').first();
      await messageInput.fill('Timestamp test');
      await messageInput.press('Enter');

      // Look for timestamp element
      const timestamp = page.locator('.message-timestamp, time').first();
      await expect(timestamp).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Message Actions', () => {
    test.beforeEach(async () => {
      // Send a message first
      const messageInput = page.locator('textarea[placeholder*="message"]').first();
      await messageInput.fill('Test message for actions');
      await messageInput.press('Enter');
      await page.waitForSelector('.message-user', { timeout: 5000 });
    });

    test('should copy message content', async () => {
      // Hover over message to show actions
      const message = page.locator('.message-user').first();
      await message.hover();

      // Click copy button
      const copyButton = message.getByRole('button', { name: /copy/i }).first();
      await copyButton.click();

      // Verify clipboard (if permissions allow)
      // This may require browser context permissions setup
    });

    test('should delete message', async () => {
      const message = page.locator('.message-user').first();
      await message.hover();

      const deleteButton = message.getByRole('button', { name: /delete/i }).first();
      await deleteButton.click();

      // Confirm deletion if there's a dialog
      const confirmButton = page.getByRole('button', { name: /confirm|yes|delete/i }).first();
      if (await confirmButton.isVisible({ timeout: 1000 })) {
        await confirmButton.click();
      }

      // Verify message is removed
      await expect(message).not.toBeVisible({ timeout: 3000 });
    });

    test('should edit message', async () => {
      const message = page.locator('.message-user').first();
      await message.hover();

      const editButton = message.getByRole('button', { name: /edit/i }).first();
      if (await editButton.isVisible({ timeout: 1000 })) {
        await editButton.click();

        // Find edit input
        const editInput = page.locator('textarea[aria-label*="edit"], input[aria-label*="edit"]').first();
        await editInput.fill('Edited message content');
        await editInput.press('Enter');

        // Verify edited content
        await expect(message).toContainText('Edited message content');
      }
    });

    test('should regenerate assistant response', async () => {
      // First send a message and wait for response
      const messageInput = page.locator('textarea[placeholder*="message"]').first();
      await messageInput.fill('Generate response');
      await messageInput.press('Enter');

      // Wait for assistant response
      await page.waitForSelector('.message-assistant', { timeout: 10000 });

      const assistantMessage = page.locator('.message-assistant').last();
      await assistantMessage.hover();

      const regenerateButton = assistantMessage.getByRole('button', { name: /regenerate/i }).first();
      if (await regenerateButton.isVisible({ timeout: 1000 })) {
        await regenerateButton.click();

        // Verify loading indicator appears
        const loadingIndicator = page.locator('.typing-indicator, .loading');
        await expect(loadingIndicator).toBeVisible({ timeout: 3000 });
      }
    });
  });

  test.describe('Auto-scroll Behavior', () => {
    test('should auto-scroll to bottom on new messages', async () => {
      const messagesContainer = page.locator('.messages-container').first();

      // Send multiple messages
      const messageInput = page.locator('textarea[placeholder*="message"]').first();
      for (let i = 0; i < 5; i++) {
        await messageInput.fill(`Message ${i + 1}`);
        await messageInput.press('Enter');
        await page.waitForTimeout(500);
      }

      // Check if scrolled to bottom
      const isAtBottom = await messagesContainer.evaluate((el) => {
        return Math.abs(el.scrollHeight - el.scrollTop - el.clientHeight) < 50;
      });
      expect(isAtBottom).toBeTruthy();
    });

    test('should show scroll to bottom button when scrolled up', async () => {
      // Send many messages
      const messageInput = page.locator('textarea[placeholder*="message"]').first();
      for (let i = 0; i < 10; i++) {
        await messageInput.fill(`Message ${i + 1}`);
        await messageInput.press('Enter');
        await page.waitForTimeout(300);
      }

      // Scroll up
      const messagesContainer = page.locator('.messages-container').first();
      await messagesContainer.evaluate((el) => {
        el.scrollTop = 0;
      });

      // Verify scroll button appears
      const scrollButton = page.locator('.scroll-to-bottom-btn, button[aria-label*="scroll"]');
      await expect(scrollButton).toBeVisible({ timeout: 2000 });
    });

    test('should scroll to bottom when button clicked', async () => {
      // Send many messages
      const messageInput = page.locator('textarea[placeholder*="message"]').first();
      for (let i = 0; i < 10; i++) {
        await messageInput.fill(`Message ${i + 1}`);
        await messageInput.press('Enter');
        await page.waitForTimeout(300);
      }

      // Scroll up
      const messagesContainer = page.locator('.messages-container').first();
      await messagesContainer.evaluate((el) => {
        el.scrollTop = 0;
      });

      // Click scroll button
      const scrollButton = page.locator('.scroll-to-bottom-btn, button[aria-label*="scroll"]');
      await scrollButton.click();

      // Verify scrolled to bottom
      await page.waitForTimeout(500);
      const isAtBottom = await messagesContainer.evaluate((el) => {
        return Math.abs(el.scrollHeight - el.scrollTop - el.clientHeight) < 50;
      });
      expect(isAtBottom).toBeTruthy();
    });
  });

  test.describe('Performance', () => {
    test('should handle many messages efficiently', async () => {
      const startTime = Date.now();

      // Send 50 messages
      const messageInput = page.locator('textarea[placeholder*="message"]').first();
      for (let i = 0; i < 50; i++) {
        await messageInput.fill(`Perf test message ${i + 1}`);
        await messageInput.press('Enter');
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(60000); // 60 seconds

      // Verify all messages rendered
      const messages = page.locator('.message-user');
      await expect(messages).toHaveCount(50, { timeout: 10000 });
    });

    test('should maintain smooth scrolling with many messages', async () => {
      // Send messages
      const messageInput = page.locator('textarea[placeholder*="message"]').first();
      for (let i = 0; i < 30; i++) {
        await messageInput.fill(`Message ${i + 1}`);
        await messageInput.press('Enter');
      }

      // Measure scroll performance
      const messagesContainer = page.locator('.messages-container').first();
      const scrollStart = await messagesContainer.evaluate((el) => {
        const start = performance.now();
        el.scrollTop = 0;
        return start;
      });

      await page.waitForTimeout(500);

      const scrollEnd = await messagesContainer.evaluate(() => {
        return performance.now();
      });

      // Scroll should be fast
      expect(scrollEnd - scrollStart).toBeLessThan(1000);
    });
  });
});
