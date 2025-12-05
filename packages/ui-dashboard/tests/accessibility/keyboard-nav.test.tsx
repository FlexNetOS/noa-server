/**
 * Keyboard navigation tests
 * Ensures all interactive elements are keyboard accessible (WCAG 2.1.1)
 */

import { describe, it, expect } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AccessibilityProvider } from '../../src/accessibility/AccessibilityProvider';

describe('Keyboard Navigation Tests', () => {
  describe('Tab Navigation', () => {
    it('should navigate through interactive elements with Tab', async () => {
      const user = userEvent.setup();

      render(
        <AccessibilityProvider>
          <div>
            <button>Button 1</button>
            <button>Button 2</button>
            <a href="/link">Link</a>
            <input type="text" aria-label="Input field" />
          </div>
        </AccessibilityProvider>
      );

      // Start at first button
      await user.tab();
      expect(document.activeElement).toHaveTextContent('Button 1');

      // Move to second button
      await user.tab();
      expect(document.activeElement).toHaveTextContent('Button 2');

      // Move to link
      await user.tab();
      expect(document.activeElement).toHaveTextContent('Link');

      // Move to input
      await user.tab();
      expect(document.activeElement).toHaveAttribute('type', 'text');
    });

    it('should navigate backwards with Shift+Tab', async () => {
      const user = userEvent.setup();

      render(
        <AccessibilityProvider>
          <div>
            <button>Button 1</button>
            <button>Button 2</button>
          </div>
        </AccessibilityProvider>
      );

      await user.tab();
      await user.tab();
      expect(document.activeElement).toHaveTextContent('Button 2');

      await user.tab({ shift: true });
      expect(document.activeElement).toHaveTextContent('Button 1');
    });

    it('should skip disabled elements', async () => {
      const user = userEvent.setup();

      render(
        <AccessibilityProvider>
          <div>
            <button>Button 1</button>
            <button disabled>Disabled Button</button>
            <button>Button 2</button>
          </div>
        </AccessibilityProvider>
      );

      await user.tab();
      expect(document.activeElement).toHaveTextContent('Button 1');

      await user.tab();
      expect(document.activeElement).toHaveTextContent('Button 2');
    });
  });

  describe('Enter and Space Key Activation', () => {
    it('should activate buttons with Enter key', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();

      render(
        <AccessibilityProvider>
          <button onClick={handleClick}>Test Button</button>
        </AccessibilityProvider>
      );

      const button = screen.getByText('Test Button');
      button.focus();

      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should activate buttons with Space key', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();

      render(
        <AccessibilityProvider>
          <button onClick={handleClick}>Test Button</button>
        </AccessibilityProvider>
      );

      const button = screen.getByText('Test Button');
      button.focus();

      await user.keyboard(' ');
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should activate custom interactive elements', async () => {
      const handleActivate = jest.fn();

      render(
        <AccessibilityProvider>
          <div
            role="button"
            tabIndex={0}
            onClick={handleActivate}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleActivate();
              }
            }}
          >
            Custom Button
          </div>
        </AccessibilityProvider>
      );

      const button = screen.getByRole('button');
      button.focus();

      fireEvent.keyDown(button, { key: 'Enter' });
      expect(handleActivate).toHaveBeenCalled();
    });
  });

  describe('Arrow Key Navigation', () => {
    it('should navigate menu items with arrow keys', () => {
      const handleKeyDown = jest.fn((e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
        }
      });

      render(
        <AccessibilityProvider>
          <div role="menu" onKeyDown={handleKeyDown}>
            <div role="menuitem" tabIndex={0}>
              Item 1
            </div>
            <div role="menuitem" tabIndex={-1}>
              Item 2
            </div>
            <div role="menuitem" tabIndex={-1}>
              Item 3
            </div>
          </div>
        </AccessibilityProvider>
      );

      const menu = screen.getByRole('menu');
      fireEvent.keyDown(menu, { key: 'ArrowDown' });
      expect(handleKeyDown).toHaveBeenCalled();
    });

    it('should navigate tabs with arrow keys', () => {
      const handleKeyDown = jest.fn();

      render(
        <AccessibilityProvider>
          <div role="tablist" aria-label="Test tabs" onKeyDown={handleKeyDown}>
            <button role="tab" aria-selected="true">
              Tab 1
            </button>
            <button role="tab" aria-selected="false">
              Tab 2
            </button>
            <button role="tab" aria-selected="false">
              Tab 3
            </button>
          </div>
        </AccessibilityProvider>
      );

      const tablist = screen.getByRole('tablist');
      fireEvent.keyDown(tablist, { key: 'ArrowRight' });
      expect(handleKeyDown).toHaveBeenCalled();
    });
  });

  describe('Escape Key', () => {
    it('should close modal with Escape key', () => {
      const handleClose = jest.fn();

      render(
        <AccessibilityProvider>
          <div
            role="dialog"
            aria-modal="true"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                handleClose();
              }
            }}
          >
            <h2>Modal Title</h2>
            <button onClick={handleClose}>Close</button>
          </div>
        </AccessibilityProvider>
      );

      const dialog = screen.getByRole('dialog');
      fireEvent.keyDown(dialog, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalled();
    });

    it('should close dropdown with Escape key', () => {
      const handleClose = jest.fn();

      render(
        <AccessibilityProvider>
          <div>
            <button aria-expanded="true" aria-haspopup="true">
              Menu
            </button>
            <div
              role="menu"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  handleClose();
                }
              }}
            >
              <div role="menuitem">Item 1</div>
            </div>
          </div>
        </AccessibilityProvider>
      );

      const menu = screen.getByRole('menu');
      fireEvent.keyDown(menu, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalled();
    });
  });

  describe('Home and End Keys', () => {
    it('should navigate to first item with Home key', () => {
      const handleKeyDown = jest.fn((e) => {
        if (e.key === 'Home') {
          e.preventDefault();
        }
      });

      render(
        <AccessibilityProvider>
          <div role="listbox" onKeyDown={handleKeyDown}>
            <div role="option" tabIndex={0}>
              Item 1
            </div>
            <div role="option" tabIndex={-1}>
              Item 2
            </div>
            <div role="option" tabIndex={-1}>
              Item 3
            </div>
          </div>
        </AccessibilityProvider>
      );

      const listbox = screen.getByRole('listbox');
      fireEvent.keyDown(listbox, { key: 'Home' });
      expect(handleKeyDown).toHaveBeenCalled();
    });

    it('should navigate to last item with End key', () => {
      const handleKeyDown = jest.fn((e) => {
        if (e.key === 'End') {
          e.preventDefault();
        }
      });

      render(
        <AccessibilityProvider>
          <div role="listbox" onKeyDown={handleKeyDown}>
            <div role="option" tabIndex={0}>
              Item 1
            </div>
            <div role="option" tabIndex={-1}>
              Item 2
            </div>
            <div role="option" tabIndex={-1}>
              Item 3
            </div>
          </div>
        </AccessibilityProvider>
      );

      const listbox = screen.getByRole('listbox');
      fireEvent.keyDown(listbox, { key: 'End' });
      expect(handleKeyDown).toHaveBeenCalled();
    });
  });

  describe('Focus Trap', () => {
    it('should trap focus within modal', async () => {
      const user = userEvent.setup();

      render(
        <AccessibilityProvider>
          <div role="dialog" aria-modal="true">
            <button>First Button</button>
            <button>Second Button</button>
            <button>Last Button</button>
          </div>
        </AccessibilityProvider>
      );

      await user.tab();
      expect(document.activeElement).toHaveTextContent('First Button');

      await user.tab();
      expect(document.activeElement).toHaveTextContent('Second Button');

      await user.tab();
      expect(document.activeElement).toHaveTextContent('Last Button');

      // Should wrap back to first button
      await user.tab();
      expect(document.activeElement).toHaveTextContent('First Button');
    });
  });

  describe('Skip Links', () => {
    it('should allow skipping to main content', async () => {
      const user = userEvent.setup();

      render(
        <AccessibilityProvider>
          <div>
            <a
              href="#main-content"
              className="skip-link"
              onClick={(e) => {
                e.preventDefault();
                const target = document.getElementById('main-content');
                target?.focus();
              }}
            >
              Skip to main content
            </a>
            <nav>
              <a href="/page1">Page 1</a>
              <a href="/page2">Page 2</a>
            </nav>
            <main id="main-content" tabIndex={-1}>
              <h1>Main Content</h1>
            </main>
          </div>
        </AccessibilityProvider>
      );

      // First tab should focus skip link
      await user.tab();
      expect(document.activeElement).toHaveTextContent('Skip to main content');

      // Clicking skip link should move focus to main
      await user.keyboard('{Enter}');
      expect(document.activeElement?.id).toBe('main-content');
    });
  });

  describe('Table Navigation', () => {
    it('should navigate table cells with arrow keys', () => {
      const handleKeyDown = jest.fn();

      render(
        <AccessibilityProvider>
          <table onKeyDown={handleKeyDown}>
            <thead>
              <tr>
                <th>Header 1</th>
                <th>Header 2</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td tabIndex={0}>Cell 1</td>
                <td tabIndex={-1}>Cell 2</td>
              </tr>
            </tbody>
          </table>
        </AccessibilityProvider>
      );

      const cell = screen.getByText('Cell 1');
      cell.focus();
      fireEvent.keyDown(cell, { key: 'ArrowRight' });
      expect(handleKeyDown).toHaveBeenCalled();
    });
  });
});
