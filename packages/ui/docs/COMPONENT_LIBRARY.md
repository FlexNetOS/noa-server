# Component Library Documentation

## Overview

This is a comprehensive, accessible component library built with React 18, TypeScript, and TailwindCSS 4.0. All components are WCAG 2.1 AA compliant and tested with axe-core.

## Installation

```bash
# Install the UI package
npm install @noa/ui

# Install peer dependencies
npm install react react-dom
```

## Quick Start

```tsx
import { Button, Input, Dialog, Tabs } from '@noa/ui';
import '@noa/ui/styles';

function App() {
  return (
    <div>
      <Button variant="primary">Click me</Button>
      <Input label="Email" type="email" />
    </div>
  );
}
```

## Components

### Button

Versatile button component with multiple variants and states.

**Props:**
- `variant`: 'primary' | 'secondary' | 'outline' | 'ghost' | 'success' | 'warning' | 'error' | 'link'
- `size`: 'sm' | 'md' | 'lg' | 'xl' | 'icon'
- `loading`: boolean
- `disabled`: boolean
- `fullWidth`: boolean
- `iconLeft`: ReactNode
- `iconRight`: ReactNode
- `aria-label`: string (required for icon-only buttons)

**Examples:**

```tsx
// Primary button
<Button variant="primary">Submit</Button>

// Button with loading state
<Button loading>Processing...</Button>

// Icon button
<Button
  aria-label="Delete item"
  iconLeft={<TrashIcon />}
  size="icon"
/>

// Full-width button
<Button fullWidth variant="success">
  Create Account
</Button>
```

**Accessibility:**
- Focus visible (2px ring)
- aria-busy when loading
- aria-disabled when disabled
- Minimum 44x44px touch target

### Input

Accessible input with labels, hints, and error messages.

**Props:**
- `label`: string
- `hint`: string
- `error`: string
- `type`: string
- `showClear`: boolean
- `onClear`: () => void
- `variant`: 'default' | 'error' | 'success'
- `size`: 'sm' | 'md' | 'lg'

**Examples:**

```tsx
// Basic input
<Input label="Email Address" type="email" />

// Input with hint
<Input
  label="Password"
  type="password"
  hint="Must be at least 8 characters"
/>

// Input with error
<Input
  label="Username"
  error="Username is already taken"
/>

// Input with clear button
<Input
  label="Search"
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  showClear
  onClear={() => setSearch('')}
/>
```

**Accessibility:**
- Label associated via htmlFor
- Hints linked via aria-describedby
- Errors linked via aria-describedby
- aria-invalid when error present

### Dialog

Accessible modal dialog with focus management.

**Components:**
- `Dialog`: Root component
- `DialogTrigger`: Button to open dialog
- `DialogPortal`: Portal to document.body
- `DialogOverlay`: Backdrop overlay
- `DialogContent`: Dialog content container
- `DialogHeader`: Header section
- `DialogTitle`: Dialog title
- `DialogDescription`: Dialog description
- `DialogFooter`: Footer section
- `DialogClose`: Close button

**Example:**

```tsx
const [open, setOpen] = useState(false);

<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogPortal>
    <DialogOverlay />
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Delete Account</DialogTitle>
        <DialogDescription>
          This action cannot be undone. Are you sure?
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button variant="error" onClick={handleDelete}>
          Delete
        </Button>
      </DialogFooter>
      <DialogClose />
    </DialogContent>
  </DialogPortal>
</Dialog>
```

**Accessibility:**
- Focus trap
- Close on Escape
- Backdrop click to close
- Focus restoration
- role="dialog" and aria-modal="true"

### Dropdown

Accessible dropdown menu with keyboard navigation.

**Components:**
- `Dropdown`: Root component
- `DropdownTrigger`: Button to open dropdown
- `DropdownContent`: Dropdown content container
- `DropdownItem`: Selectable item
- `DropdownLabel`: Section label
- `DropdownSeparator`: Visual separator

**Props:**
- `value`: string | string[]
- `onValueChange`: (value) => void
- `multiple`: boolean
- `open`: boolean
- `onOpenChange`: (open) => void

**Example:**

```tsx
const [value, setValue] = useState('');

<Dropdown value={value} onValueChange={setValue}>
  <DropdownTrigger>Select Option</DropdownTrigger>
  <DropdownContent>
    <DropdownLabel>Categories</DropdownLabel>
    <DropdownItem value="design">Design</DropdownItem>
    <DropdownItem value="development">Development</DropdownItem>
    <DropdownSeparator />
    <DropdownItem value="marketing">Marketing</DropdownItem>
  </DropdownContent>
</Dropdown>

// Multi-select
<Dropdown
  value={values}
  onValueChange={setValues}
  multiple
>
  <DropdownTrigger>Select Multiple</DropdownTrigger>
  <DropdownContent>
    <DropdownItem value="1">Option 1</DropdownItem>
    <DropdownItem value="2">Option 2</DropdownItem>
  </DropdownContent>
</Dropdown>
```

**Accessibility:**
- Arrow key navigation
- Type-ahead search
- Enter/Space to select
- Escape to close
- aria-haspopup and aria-expanded

### Tabs

Accessible tabs with keyboard navigation.

**Components:**
- `Tabs`: Root component
- `TabsList`: Tab list container
- `TabsTrigger`: Individual tab
- `TabsContent`: Tab panel content

**Props:**
- `value`: string
- `onValueChange`: (value) => void
- `defaultValue`: string
- `orientation`: 'horizontal' | 'vertical'
- `activationMode`: 'automatic' | 'manual'

**Example:**

```tsx
<Tabs defaultValue="profile">
  <TabsList>
    <TabsTrigger value="profile">Profile</TabsTrigger>
    <TabsTrigger value="security">Security</TabsTrigger>
    <TabsTrigger value="notifications">Notifications</TabsTrigger>
  </TabsList>

  <TabsContent value="profile">
    Profile settings content
  </TabsContent>

  <TabsContent value="security">
    Security settings content
  </TabsContent>

  <TabsContent value="notifications">
    Notification settings content
  </TabsContent>
</Tabs>

// Vertical tabs
<Tabs orientation="vertical" defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content 1</TabsContent>
  <TabsContent value="tab2">Content 2</TabsContent>
</Tabs>
```

**Accessibility:**
- Arrow key navigation
- Home/End keys
- Roving tabindex
- role="tablist", "tab", and "tabpanel"

### Accordion

Accessible accordion with collapsible sections.

**Components:**
- `Accordion`: Root component
- `AccordionItem`: Individual item
- `AccordionTrigger`: Clickable header
- `AccordionContent`: Collapsible content

**Props:**
- `type`: 'single' | 'multiple'
- `value`: string | string[]
- `onValueChange`: (value) => void
- `defaultValue`: string | string[]
- `collapsible`: boolean

**Example:**

```tsx
// Single expansion
<Accordion type="single" collapsible>
  <AccordionItem value="item1">
    <AccordionTrigger value="item1">
      What is accessibility?
    </AccordionTrigger>
    <AccordionContent value="item1">
      Accessibility ensures content is usable by everyone.
    </AccordionContent>
  </AccordionItem>

  <AccordionItem value="item2">
    <AccordionTrigger value="item2">
      Why is it important?
    </AccordionTrigger>
    <AccordionContent value="item2">
      It's a legal requirement and improves UX for all users.
    </AccordionContent>
  </AccordionItem>
</Accordion>

// Multiple expansion
<Accordion type="multiple" defaultValue={['item1', 'item2']}>
  <AccordionItem value="item1">
    <AccordionTrigger value="item1">Item 1</AccordionTrigger>
    <AccordionContent value="item1">Content 1</AccordionContent>
  </AccordionItem>
  <AccordionItem value="item2">
    <AccordionTrigger value="item2">Item 2</AccordionTrigger>
    <AccordionContent value="item2">Content 2</AccordionContent>
  </AccordionItem>
</Accordion>
```

**Accessibility:**
- Arrow key navigation
- Enter/Space to toggle
- aria-expanded
- Smooth animations

### Toast

Accessible toast notifications.

**Components:**
- `ToastProvider`: Provider component
- `useToast`: Hook to trigger toasts

**Props:**
- `title`: string
- `description`: string
- `variant`: 'default' | 'success' | 'error' | 'warning' | 'info'
- `duration`: number (milliseconds)
- `action`: { label: string, onClick: () => void }

**Example:**

```tsx
// Wrap app with ToastProvider
function App() {
  return (
    <ToastProvider position="bottom-right" maxToasts={5}>
      <YourApp />
    </ToastProvider>
  );
}

// Use in components
function MyComponent() {
  const { addToast } = useToast();

  const handleSuccess = () => {
    addToast({
      title: 'Success!',
      description: 'Your changes have been saved.',
      variant: 'success',
      duration: 5000,
    });
  };

  const handleError = () => {
    addToast({
      title: 'Error',
      description: 'Something went wrong. Please try again.',
      variant: 'error',
      action: {
        label: 'Retry',
        onClick: () => handleRetry(),
      },
    });
  };

  return (
    <div>
      <Button onClick={handleSuccess}>Save</Button>
      <Button onClick={handleError}>Trigger Error</Button>
    </div>
  );
}
```

**Accessibility:**
- aria-live="polite" region
- Auto-dismiss with pause on hover
- Close button with aria-label
- role="status"

## Theming

All components support dark mode and custom themes via CSS variables.

```css
:root {
  --primary-600: #4f46e5;
  --primary-700: #4338ca;
  --success-600: #16a34a;
  --error-600: #dc2626;
  /* ... more variables */
}

.dark {
  --primary-600: #6366f1;
  --primary-700: #4f46e5;
  /* ... dark theme overrides */
}
```

## Testing

```bash
# Run all tests
npm run test

# Run accessibility tests
npm run test:a11y

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## TypeScript Support

All components are fully typed with TypeScript:

```tsx
import type { ButtonProps, InputProps } from '@noa/ui';

const MyButton: React.FC<ButtonProps> = (props) => {
  return <Button {...props} />;
};
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT
