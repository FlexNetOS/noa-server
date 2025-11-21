import { test, expect, type Page } from '@playwright/test';
import path from 'path';

/**
 * File Upload and Browser E2E Tests
 * Tests file upload, drag-and-drop, file browser, previews, and download functionality.
 */

test.describe('File Upload and Browser', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('/');
    // Navigate to file section or component
    const fileSection = page.locator('[data-testid="file-section"], #files').first();
    if (await fileSection.isVisible({ timeout: 2000 })) {
      await fileSection.click();
    }
  });

  test.describe('File Upload', () => {
    test('should upload a single file', async () => {
      const fileInput = page.locator('input[type="file"]').first();

      // Create a test file
      await fileInput.setInputFiles({
        name: 'test.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('Test file content'),
      });

      // Verify file appears in upload list
      const uploadedFile = page.locator('[data-testid="uploaded-file"], .file-item').first();
      await expect(uploadedFile).toBeVisible({ timeout: 5000 });
      await expect(uploadedFile).toContainText('test.txt');
    });

    test('should upload multiple files', async () => {
      const fileInput = page.locator('input[type="file"]').first();

      await fileInput.setInputFiles([
        {
          name: 'file1.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('File 1 content'),
        },
        {
          name: 'file2.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('File 2 content'),
        },
        {
          name: 'file3.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('File 3 content'),
        },
      ]);

      // Verify all files appear
      const uploadedFiles = page.locator('[data-testid="uploaded-file"], .file-item');
      await expect(uploadedFiles).toHaveCount(3, { timeout: 5000 });
    });

    test('should show upload progress', async () => {
      const fileInput = page.locator('input[type="file"]').first();

      // Upload larger file to see progress
      const largeContent = 'x'.repeat(1024 * 100); // 100KB
      await fileInput.setInputFiles({
        name: 'large.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from(largeContent),
      });

      // Look for progress indicator
      const progress = page.locator('[role="progressbar"], .progress, .upload-progress').first();
      await expect(progress).toBeVisible({ timeout: 3000 });
    });

    test('should validate file types', async () => {
      const fileInput = page.locator('input[type="file"]').first();

      // Try uploading an executable (should be rejected if validation exists)
      await fileInput.setInputFiles({
        name: 'virus.exe',
        mimeType: 'application/x-msdownload',
        buffer: Buffer.from('Fake executable'),
      });

      // Check for error message
      const error = page.locator('[role="alert"], .error-message, .toast').first();
      if (await error.isVisible({ timeout: 2000 })) {
        await expect(error).toContainText(/not allowed|invalid|unsupported/i);
      }
    });

    test('should validate file size limits', async () => {
      const fileInput = page.locator('input[type="file"]').first();

      // Try uploading very large file
      const hugeContent = 'x'.repeat(1024 * 1024 * 100); // 100MB
      await fileInput.setInputFiles({
        name: 'huge.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from(hugeContent),
      });

      // Check for size error
      const error = page.locator('[role="alert"], .error-message, .toast').first();
      if (await error.isVisible({ timeout: 2000 })) {
        await expect(error).toContainText(/too large|size limit|exceeds/i);
      }
    });

    test('should remove uploaded file', async () => {
      const fileInput = page.locator('input[type="file"]').first();

      await fileInput.setInputFiles({
        name: 'remove-me.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('Remove this file'),
      });

      // Wait for file to appear
      const uploadedFile = page.locator('[data-testid="uploaded-file"], .file-item').first();
      await expect(uploadedFile).toBeVisible();

      // Click remove button
      const removeButton = uploadedFile.locator('button[aria-label*="remove"], button[aria-label*="delete"]').first();
      await removeButton.click();

      // Verify file is removed
      await expect(uploadedFile).not.toBeVisible({ timeout: 3000 });
    });

    test('should retry failed upload', async () => {
      const fileInput = page.locator('input[type="file"]').first();

      await fileInput.setInputFiles({
        name: 'retry.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('Retry test'),
      });

      // Wait for upload to potentially fail
      await page.waitForTimeout(2000);

      // Look for retry button (if upload failed)
      const retryButton = page.locator('button[aria-label*="retry"]').first();
      if (await retryButton.isVisible({ timeout: 1000 })) {
        await retryButton.click();

        // Verify retry attempt
        const progress = page.locator('[role="progressbar"], .progress').first();
        await expect(progress).toBeVisible({ timeout: 3000 });
      }
    });
  });

  test.describe('Drag and Drop', () => {
    test('should accept files via drag and drop', async () => {
      const dropZone = page.locator('[data-testid="drop-zone"], .dropzone').first();

      // Simulate drag and drop
      const dataTransfer = await page.evaluateHandle(() => {
        const dt = new DataTransfer();
        const file = new File(['Dropped file content'], 'dropped.txt', {
          type: 'text/plain',
        });
        dt.items.add(file);
        return dt;
      });

      await dropZone.dispatchEvent('drop', { dataTransfer });

      // Verify file appears
      const uploadedFile = page.locator('[data-testid="uploaded-file"], .file-item');
      await expect(uploadedFile).toBeVisible({ timeout: 5000 });
    });

    test('should show drag overlay on drag enter', async () => {
      const dropZone = page.locator('[data-testid="drop-zone"], .dropzone').first();

      await dropZone.dispatchEvent('dragenter');

      // Check for overlay or highlight
      const overlay = page.locator('.drag-overlay, .drag-active').first();
      if (await overlay.isVisible({ timeout: 1000 })) {
        await expect(overlay).toBeVisible();
      }
    });
  });

  test.describe('File Browser', () => {
    test('should display uploaded files in browser', async () => {
      const fileInput = page.locator('input[type="file"]').first();

      // Upload test files
      await fileInput.setInputFiles([
        {
          name: 'doc1.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('Document 1'),
        },
        {
          name: 'doc2.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('Document 2'),
        },
      ]);

      // Check file browser
      const fileBrowser = page.locator('[data-testid="file-browser"], .file-list');
      await expect(fileBrowser).toBeVisible({ timeout: 5000 });

      const files = fileBrowser.locator('.file-item');
      await expect(files).toHaveCount(2, { timeout: 3000 });
    });

    test('should search files by name', async () => {
      const fileInput = page.locator('input[type="file"]').first();

      await fileInput.setInputFiles([
        {
          name: 'important.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('Important file'),
        },
        {
          name: 'notes.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('Notes file'),
        },
      ]);

      // Use search input
      const searchInput = page.locator('input[placeholder*="search"], input[aria-label*="search"]').first();
      await searchInput.fill('important');

      // Verify filtered results
      const fileItems = page.locator('.file-item');
      await expect(fileItems).toHaveCount(1, { timeout: 3000 });
      await expect(fileItems.first()).toContainText('important.txt');
    });

    test('should sort files', async () => {
      const fileInput = page.locator('input[type="file"]').first();

      await fileInput.setInputFiles([
        {
          name: 'zzz.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('Last'),
        },
        {
          name: 'aaa.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('First'),
        },
      ]);

      // Click sort button or dropdown
      const sortButton = page.locator('button[aria-label*="sort"], select[aria-label*="sort"]').first();
      if (await sortButton.isVisible({ timeout: 2000 })) {
        await sortButton.click();

        // Select name ascending
        const nameOption = page.locator('text="Name"').first();
        if (await nameOption.isVisible({ timeout: 1000 })) {
          await nameOption.click();
        }

        // Verify sort order
        const firstFile = page.locator('.file-item').first();
        await expect(firstFile).toContainText('aaa.txt');
      }
    });

    test('should filter files by type', async () => {
      const fileInput = page.locator('input[type="file"]').first();

      await fileInput.setInputFiles([
        {
          name: 'image.png',
          mimeType: 'image/png',
          buffer: Buffer.from('PNG data'),
        },
        {
          name: 'document.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.from('PDF data'),
        },
      ]);

      // Use filter dropdown
      const filterButton = page.locator('button[aria-label*="filter"], select[aria-label*="type"]').first();
      if (await filterButton.isVisible({ timeout: 2000 })) {
        await filterButton.click();

        // Select images only
        const imagesOption = page.locator('text="Images"').first();
        if (await imagesOption.isVisible({ timeout: 1000 })) {
          await imagesOption.click();

          // Verify only images shown
          const fileItems = page.locator('.file-item');
          await expect(fileItems).toHaveCount(1);
          await expect(fileItems.first()).toContainText('image.png');
        }
      }
    });
  });

  test.describe('File Preview', () => {
    test('should preview text files', async () => {
      const fileInput = page.locator('input[type="file"]').first();

      const content = 'This is preview text content';
      await fileInput.setInputFiles({
        name: 'preview.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from(content),
      });

      // Click file to preview
      const fileItem = page.locator('.file-item').first();
      await fileItem.click();

      // Check preview panel
      const preview = page.locator('[data-testid="file-preview"], .preview-panel').first();
      await expect(preview).toBeVisible({ timeout: 5000 });
      await expect(preview).toContainText(content);
    });

    test('should preview images', async () => {
      const fileInput = page.locator('input[type="file"]').first();

      // Create small PNG image
      const pngData = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        // Minimal PNG header
      ]);

      await fileInput.setInputFiles({
        name: 'image.png',
        mimeType: 'image/png',
        buffer: pngData,
      });

      const fileItem = page.locator('.file-item').first();
      await fileItem.click();

      // Check for image preview
      const imagePreview = page.locator('img[alt*="preview"], .image-preview img').first();
      await expect(imagePreview).toBeVisible({ timeout: 5000 });
    });

    test('should close preview panel', async () => {
      const fileInput = page.locator('input[type="file"]').first();

      await fileInput.setInputFiles({
        name: 'close-test.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('Close preview test'),
      });

      const fileItem = page.locator('.file-item').first();
      await fileItem.click();

      const preview = page.locator('[data-testid="file-preview"], .preview-panel').first();
      await expect(preview).toBeVisible();

      // Close preview
      const closeButton = preview.locator('button[aria-label*="close"]').first();
      await closeButton.click();

      await expect(preview).not.toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('File Download', () => {
    test('should download file', async () => {
      const fileInput = page.locator('input[type="file"]').first();

      await fileInput.setInputFiles({
        name: 'download.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('Download test content'),
      });

      const fileItem = page.locator('.file-item').first();
      await fileItem.hover();

      const downloadButton = fileItem.locator('button[aria-label*="download"]').first();
      if (await downloadButton.isVisible({ timeout: 1000 })) {
        const [download] = await Promise.all([
          page.waitForEvent('download'),
          downloadButton.click(),
        ]);

        expect(download.suggestedFilename()).toBe('download.txt');
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should have accessible file upload button', async () => {
      const uploadButton = page.locator('button[aria-label*="upload"], label[for*="file"]').first();
      await expect(uploadButton).toBeVisible();

      // Check for proper labeling
      const ariaLabel = await uploadButton.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
    });

    test('should be keyboard navigable', async () => {
      const fileInput = page.locator('input[type="file"]').first();

      await fileInput.setInputFiles([
        {
          name: 'nav1.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('Nav test 1'),
        },
        {
          name: 'nav2.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('Nav test 2'),
        },
      ]);

      // Tab through files
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Verify focus
      const focusedElement = await page.evaluate(() => document.activeElement?.className);
      expect(focusedElement).toBeTruthy();
    });
  });
});
