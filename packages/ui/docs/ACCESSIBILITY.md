# Accessibility Guide - WCAG 2.1 AA Compliance

This component library is built with accessibility as a core principle, ensuring WCAG 2.1 AA compliance for all components.

## Key Accessibility Features

### 1. Keyboard Navigation

All interactive components support full keyboard navigation:

- **Tab**: Move focus to next interactive element
- **Shift + Tab**: Move focus to previous interactive element
- **Enter/Space**: Activate buttons, links, and selections
- **Escape**: Close dialogs, dropdowns, and modals
- **Arrow Keys**: Navigate lists, menus, tabs, and accordions
- **Home/End**: Jump to first/last item in lists

### 2. Screen Reader Support

Components include proper ARIA attributes for screen readers:

- **aria-label**: Descriptive labels for icon-only buttons
- **aria-describedby**: Associate hints and error messages with inputs
- **aria-expanded**: Indicate collapsible sections state
- **aria-selected**: Show selected tabs and list items
- **aria-live**: Announce dynamic content changes (toasts)
- **aria-invalid**: Mark form fields with errors
- **aria-busy**: Indicate loading states

### 3. Focus Management

- **Visible Focus Indicators**: 2px outline with 3:1 contrast ratio
- **Focus Trap**: Dialogs trap focus within modal
- **Focus Restoration**: Return focus to trigger element on close
- **Roving Tabindex**: Efficient keyboard navigation in lists

### 4. Color Contrast

All text and UI components meet WCAG 2.1 AA contrast requirements:

- **Normal Text**: ≥4.5:1 contrast ratio
- **Large Text (18px+)**: ≥3:1 contrast ratio
- **UI Components**: ≥3:1 contrast ratio

### 5. Touch Target Size

All interactive elements meet minimum touch target size:

- **Minimum Size**: 44x44px (WCAG 2.5.5)
- **Recommended Size**: 48x48px

## Component-Specific Accessibility

### Button

```tsx
// Good: Text button
<Button>Submit Form</Button>

// Good: Icon button with aria-label
<Button aria-label="Close dialog" iconLeft={<XIcon />} />

// Good: Loading state
<Button loading>Processing...</Button>
// Automatically adds aria-busy="true"
```

**Features**:
- Focus visible (2px ring)
- aria-busy when loading
- aria-disabled when disabled
- Minimum 44x44px touch target

### Input

```tsx
// Good: Input with label
<Input
  label="Email Address"
  type="email"
  hint="We'll never share your email"
  required
/>

// Good: Input with error
<Input
  label="Password"
  type="password"
  error="Password must be at least 8 characters"
/>
```

**Features**:
- Label associated via htmlFor
- Hints linked via aria-describedby
- Errors linked via aria-describedby
- aria-invalid when error present
- Required fields marked with asterisk

### Dialog

```tsx
// Good: Accessible dialog
<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogPortal>
    <DialogOverlay />
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Confirm Action</DialogTitle>
        <DialogDescription>
          Are you sure you want to continue?
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button onClick={handleConfirm}>Confirm</Button>
      </DialogFooter>
    </DialogContent>
  </DialogPortal>
</Dialog>
```

**Features**:
- Focus trap (focus stays in dialog)
- Close on Escape key
- Backdrop click to close (optional)
- Focus restoration on close
- role="dialog" and aria-modal="true"

### Dropdown

```tsx
// Good: Accessible dropdown
<Dropdown value={value} onValueChange={setValue}>
  <DropdownTrigger>Select Option</DropdownTrigger>
  <DropdownContent>
    <DropdownLabel>Options</DropdownLabel>
    <DropdownItem value="1">Option 1</DropdownItem>
    <DropdownItem value="2">Option 2</DropdownItem>
    <DropdownSeparator />
    <DropdownItem value="3">Option 3</DropdownItem>
  </DropdownContent>
</Dropdown>
```

**Features**:
- Arrow key navigation (Up/Down)
- Type-ahead search
- Enter/Space to select
- Escape to close
- aria-haspopup and aria-expanded
- Multi-select support

### Tabs

```tsx
// Good: Accessible tabs
<Tabs defaultValue="tab1">
  <TabsList aria-label="Account settings">
    <TabsTrigger value="tab1">Profile</TabsTrigger>
    <TabsTrigger value="tab2">Security</TabsTrigger>
    <TabsTrigger value="tab3">Notifications</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Profile settings</TabsContent>
  <TabsContent value="tab2">Security settings</TabsContent>
  <TabsContent value="tab3">Notification settings</TabsContent>
</Tabs>
```

**Features**:
- Arrow key navigation (Left/Right or Up/Down)
- Home/End keys
- Automatic or manual activation
- Roving tabindex
- role="tablist", "tab", and "tabpanel"

### Accordion

```tsx
// Good: Accessible accordion
<Accordion type="single" collapsible>
  <AccordionItem value="item1">
    <AccordionTrigger value="item1">
      What is accessibility?
    </AccordionTrigger>
    <AccordionContent value="item1">
      Accessibility ensures digital content is usable by everyone.
    </AccordionContent>
  </AccordionItem>
</Accordion>
```

**Features**:
- Arrow key navigation (Up/Down)
- Home/End keys
- Enter/Space to toggle
- aria-expanded
- Single or multiple expansion

### Toast

```tsx
// Good: Accessible toast
const { addToast } = useToast();

addToast({
  title: 'Success',
  description: 'Your changes have been saved.',
  variant: 'success',
  duration: 5000,
});
```

**Features**:
- aria-live="polite" region
- Auto-dismiss with pause on hover
- Close button with aria-label
- role="status" on toast items

## Testing Accessibility

### Automated Testing with axe-core

```bash
# Run accessibility tests
npm run test:a11y

# Run all tests with coverage
npm run test:coverage
```

### Manual Testing Checklist

- [ ] **Keyboard Navigation**: Tab through all interactive elements
- [ ] **Screen Reader**: Test with NVDA, JAWS, or VoiceOver
- [ ] **Focus Visible**: Ensure focus indicators are visible
- [ ] **Color Contrast**: Check contrast ratios in DevTools
- [ ] **Touch Targets**: Verify 44x44px minimum size
- [ ] **Zoom**: Test at 200% zoom level
- [ ] **Dark Mode**: Test color contrast in dark theme

### Browser Testing

Test in multiple browsers and assistive technologies:

- **Chrome** + ChromeVox
- **Firefox** + NVDA (Windows)
- **Safari** + VoiceOver (macOS/iOS)
- **Edge** + Narrator (Windows)

## ARIA Patterns Reference

### Dialog (Modal)

- `role="dialog"`
- `aria-modal="true"`
- `aria-labelledby` (points to title)
- `aria-describedby` (points to description)

### Listbox (Dropdown)

- `role="listbox"` on container
- `role="option"` on items
- `aria-selected` on items
- `aria-haspopup="listbox"` on trigger
- `aria-expanded` on trigger

### Tabs

- `role="tablist"` on container
- `role="tab"` on triggers
- `role="tabpanel"` on content
- `aria-selected` on tabs
- `aria-controls` linking tab to panel
- `aria-labelledby` linking panel to tab

### Accordion

- `aria-expanded` on triggers
- `aria-controls` linking trigger to content
- `role="region"` on content
- `aria-labelledby` linking content to trigger

## Common Accessibility Pitfalls to Avoid

### Don't

❌ Icon-only buttons without aria-label:
```tsx
<Button iconLeft={<CloseIcon />} /> // Missing aria-label
```

❌ Form inputs without labels:
```tsx
<Input placeholder="Enter email" /> // Missing label
```

❌ Non-semantic click handlers:
```tsx
<div onClick={handleClick}>Click me</div> // Use <button>
```

❌ Custom components without ARIA:
```tsx
<div className="dropdown">...</div> // Missing roles
```

### Do

✅ Icon-only buttons with aria-label:
```tsx
<Button aria-label="Close dialog" iconLeft={<CloseIcon />} />
```

✅ Form inputs with labels:
```tsx
<Input label="Email Address" type="email" />
```

✅ Semantic HTML:
```tsx
<Button onClick={handleClick}>Click me</Button>
```

✅ Proper ARIA roles:
```tsx
<Dropdown>...</Dropdown> // Uses role="listbox"
```

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Inclusive Components](https://inclusive-components.design/)

## Getting Help

If you encounter accessibility issues or have questions:

1. Check component documentation
2. Review automated test results
3. Test with screen readers
4. Open an issue on GitHub
5. Consult WCAG 2.1 guidelines

Remember: Accessibility is not optional—it's a fundamental requirement for inclusive web development.
