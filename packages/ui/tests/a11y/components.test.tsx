/**
 * Accessibility Tests for Component Library
 * Tests WCAG 2.1 AA compliance using axe-core
 */

import React from 'react';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, it, expect } from 'vitest';

import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '../../src/components/ui/Dialog';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownLabel,
} from '../../src/components/ui/Dropdown';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '../../src/components/ui/Tabs';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '../../src/components/ui/Accordion';
import { ToastProvider, useToast } from '../../src/components/ui/Toast';

expect.extend(toHaveNoViolations);

describe('Button Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<Button>Click me</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no violations with icon-only button with aria-label', async () => {
    const { container } = render(
      <Button aria-label="Close" iconLeft={<span>X</span>} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no violations in loading state', async () => {
    const { container } = render(<Button loading>Loading</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no violations in disabled state', async () => {
    const { container } = render(<Button disabled>Disabled</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have aria-busy when loading', () => {
    const { getByRole } = render(<Button loading>Loading</Button>);
    const button = getByRole('button');
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('should have aria-disabled when disabled', () => {
    const { getByRole } = render(<Button disabled>Disabled</Button>);
    const button = getByRole('button');
    expect(button).toHaveAttribute('aria-disabled', 'true');
  });
});

describe('Input Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(
      <Input label="Email" type="email" placeholder="Enter email" />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should associate label with input via htmlFor', () => {
    const { getByLabelText } = render(<Input label="Email" type="email" />);
    const input = getByLabelText('Email');
    expect(input).toBeInTheDocument();
  });

  it('should have aria-describedby for hint text', () => {
    const { getByRole } = render(
      <Input label="Password" type="password" hint="Must be 8+ characters" />
    );
    const input = getByRole('textbox', { hidden: true }) || document.querySelector('input[type="password"]');
    const hintId = input?.getAttribute('aria-describedby');
    expect(hintId).toBeTruthy();
  });

  it('should have aria-invalid when error is present', () => {
    const { getByRole } = render(
      <Input label="Email" type="email" error="Invalid email" />
    );
    const input = getByRole('textbox');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('should have no violations with error state', async () => {
    const { container } = render(
      <Input label="Email" type="email" error="Invalid email address" />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have aria-label on clear button', () => {
    const { container } = render(
      <Input label="Search" value="test" showClear onClear={() => {}} />
    );
    const clearButton = container.querySelector('button[aria-label="Clear input"]');
    expect(clearButton).toBeInTheDocument();
  });
});

describe('Dialog Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogPortal>
          <DialogOverlay />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dialog Title</DialogTitle>
              <DialogDescription>Dialog description text</DialogDescription>
            </DialogHeader>
            <p>Dialog content</p>
            <DialogFooter>
              <Button>Cancel</Button>
              <Button>Confirm</Button>
            </DialogFooter>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have role="dialog" and aria-modal="true"', () => {
    const { getByRole } = render(
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogPortal>
          <DialogContent>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    );
    const dialog = getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });
});

describe('Dropdown Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(
      <Dropdown open={true}>
        <DropdownTrigger>Select option</DropdownTrigger>
        <DropdownContent>
          <DropdownLabel>Options</DropdownLabel>
          <DropdownItem value="1">Option 1</DropdownItem>
          <DropdownItem value="2">Option 2</DropdownItem>
          <DropdownSeparator />
          <DropdownItem value="3">Option 3</DropdownItem>
        </DropdownContent>
      </Dropdown>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have aria-haspopup and aria-expanded on trigger', () => {
    const { getByRole } = render(
      <Dropdown open={true}>
        <DropdownTrigger>Select option</DropdownTrigger>
        <DropdownContent>
          <DropdownItem value="1">Option 1</DropdownItem>
        </DropdownContent>
      </Dropdown>
    );
    const trigger = getByRole('button');
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('should have role="listbox" on content', () => {
    const { container } = render(
      <Dropdown open={true}>
        <DropdownTrigger>Select option</DropdownTrigger>
        <DropdownContent>
          <DropdownItem value="1">Option 1</DropdownItem>
        </DropdownContent>
      </Dropdown>
    );
    const listbox = container.querySelector('[role="listbox"]');
    expect(listbox).toBeInTheDocument();
  });

  it('should have role="option" and aria-selected on items', () => {
    const { container } = render(
      <Dropdown open={true} value="1">
        <DropdownTrigger>Select option</DropdownTrigger>
        <DropdownContent>
          <DropdownItem value="1">Option 1</DropdownItem>
          <DropdownItem value="2">Option 2</DropdownItem>
        </DropdownContent>
      </Dropdown>
    );
    const options = container.querySelectorAll('[role="option"]');
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(options[1]).toHaveAttribute('aria-selected', 'false');
  });
});

describe('Tabs Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          <TabsTrigger value="tab3">Tab 3</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Tab 1 content</TabsContent>
        <TabsContent value="tab2">Tab 2 content</TabsContent>
        <TabsContent value="tab3">Tab 3 content</TabsContent>
      </Tabs>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have role="tablist" with aria-orientation', () => {
    const { container } = render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content</TabsContent>
      </Tabs>
    );
    const tablist = container.querySelector('[role="tablist"]');
    expect(tablist).toBeInTheDocument();
    expect(tablist).toHaveAttribute('aria-orientation', 'horizontal');
  });

  it('should have role="tab" with aria-selected', () => {
    const { getAllByRole } = render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>
    );
    const tabs = getAllByRole('tab');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
  });

  it('should have role="tabpanel" with aria-labelledby', () => {
    const { getByRole } = render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content</TabsContent>
      </Tabs>
    );
    const tabpanel = getByRole('tabpanel');
    expect(tabpanel).toHaveAttribute('aria-labelledby');
  });

  it('should use roving tabindex', () => {
    const { getAllByRole } = render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>
    );
    const tabs = getAllByRole('tab');
    expect(tabs[0]).toHaveAttribute('tabIndex', '0');
    expect(tabs[1]).toHaveAttribute('tabIndex', '-1');
  });
});

describe('Accordion Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(
      <Accordion type="single" defaultValue="item1">
        <AccordionItem value="item1">
          <AccordionTrigger value="item1">Item 1</AccordionTrigger>
          <AccordionContent value="item1">Content 1</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item2">
          <AccordionTrigger value="item2">Item 2</AccordionTrigger>
          <AccordionContent value="item2">Content 2</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have aria-expanded on triggers', () => {
    const { container } = render(
      <Accordion type="single" defaultValue="item1">
        <AccordionItem value="item1">
          <AccordionTrigger value="item1">Item 1</AccordionTrigger>
          <AccordionContent value="item1">Content 1</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item2">
          <AccordionTrigger value="item2">Item 2</AccordionTrigger>
          <AccordionContent value="item2">Content 2</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
    const triggers = container.querySelectorAll('[data-accordion-trigger]');
    expect(triggers[0]).toHaveAttribute('aria-expanded', 'true');
    expect(triggers[1]).toHaveAttribute('aria-expanded', 'false');
  });

  it('should associate content with trigger via aria-controls', () => {
    const { container } = render(
      <Accordion type="single" defaultValue="item1">
        <AccordionItem value="item1">
          <AccordionTrigger value="item1">Item 1</AccordionTrigger>
          <AccordionContent value="item1">Content 1</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
    const trigger = container.querySelector('[data-accordion-trigger]');
    const controlsId = trigger?.getAttribute('aria-controls');
    expect(controlsId).toBe('accordion-content-item1');
  });

  it('should have role="region" on content', () => {
    const { container } = render(
      <Accordion type="single" defaultValue="item1">
        <AccordionItem value="item1">
          <AccordionTrigger value="item1">Item 1</AccordionTrigger>
          <AccordionContent value="item1">Content 1</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
    const content = container.querySelector('[role="region"]');
    expect(content).toBeInTheDocument();
  });
});

describe('Toast Accessibility', () => {
  const TestToastComponent = () => {
    const { addToast } = useToast();

    React.useEffect(() => {
      addToast({
        title: 'Success',
        description: 'Operation completed successfully',
        variant: 'success',
      });
    }, [addToast]);

    return null;
  };

  it('should have no accessibility violations', async () => {
    const { container } = render(
      <ToastProvider>
        <TestToastComponent />
      </ToastProvider>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have aria-live region', () => {
    const { container } = render(
      <ToastProvider>
        <TestToastComponent />
      </ToastProvider>
    );
    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
  });

  it('should have role="status" on toast items', () => {
    const { container } = render(
      <ToastProvider>
        <TestToastComponent />
      </ToastProvider>
    );
    const toast = container.querySelector('[role="status"]');
    expect(toast).toBeInTheDocument();
  });

  it('should have aria-label on close button', () => {
    const { container } = render(
      <ToastProvider>
        <TestToastComponent />
      </ToastProvider>
    );
    const closeButton = container.querySelector('[aria-label="Close notification"]');
    expect(closeButton).toBeInTheDocument();
  });
});

describe('Color Contrast Compliance', () => {
  it('Button primary variant should have sufficient contrast', async () => {
    const { container } = render(<Button variant="primary">Primary Button</Button>);
    const results = await axe(container, {
      rules: {
        'color-contrast': { enabled: true },
      },
    });
    expect(results).toHaveNoViolations();
  });

  it('Input error state should have sufficient contrast', async () => {
    const { container } = render(
      <Input label="Email" error="Invalid email" />
    );
    const results = await axe(container, {
      rules: {
        'color-contrast': { enabled: true },
      },
    });
    expect(results).toHaveNoViolations();
  });
});

describe('Keyboard Navigation', () => {
  it('All interactive elements should be keyboard accessible', async () => {
    const { container } = render(
      <div>
        <Button>Button</Button>
        <Input label="Input" />
        <Dropdown>
          <DropdownTrigger>Dropdown</DropdownTrigger>
        </Dropdown>
      </div>
    );
    const results = await axe(container, {
      rules: {
        'keyboard': { enabled: true },
        'focus-order-semantics': { enabled: true },
      },
    });
    expect(results).toHaveNoViolations();
  });
});
