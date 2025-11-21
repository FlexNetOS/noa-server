# Noa UI Quick Start Guide

Get started with the Noa UI Design System in 5 minutes.

## Installation

```bash
cd packages/ui
pnpm install
```

## Setup in Your App

### 1. Import Global Styles

Add to your root component or main entry file:

```tsx
// App.tsx or main.tsx
import '@noa/ui/styles';

function App() {
  return <div>Your app</div>;
}
```

### 2. Configure Tailwind (if needed)

If your app uses Tailwind, extend the config:

```js
// tailwind.config.js
import uiConfig from '@noa/ui/tailwind.config';

export default {
  ...uiConfig,
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './node_modules/@noa/ui/dist/**/*.{js,mjs}',
  ],
};
```

### 3. Initialize Theme

Add theme initialization to your app root:

```tsx
import { useEffect } from 'react';
import { initializeTheme } from '@noa/ui/themes';

function App() {
  useEffect(() => {
    initializeTheme(); // Auto-detects system preference
  }, []);

  return <div>Your app</div>;
}
```

## Basic Usage Examples

### Buttons

```tsx
import { Button } from '@noa/ui';

function MyComponent() {
  return (
    <>
      <Button variant="primary">Click me</Button>
      <Button variant="outline" size="lg">Large Button</Button>
      <Button loading>Loading...</Button>
    </>
  );
}
```

### Form Inputs

```tsx
import { Input, Select, Checkbox } from '@noa/ui';

function MyForm() {
  return (
    <form>
      <Input
        placeholder="Enter your email"
        type="email"
        helperText="We'll never share your email"
      />

      <Select
        options={[
          { value: '1', label: 'Option 1' },
          { value: '2', label: 'Option 2' },
        ]}
      />

      <label>
        <Checkbox />
        <span>I agree to terms</span>
      </label>
    </form>
  );
}
```

### Cards

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button
} from '@noa/ui';

function MyCard() {
  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle>Welcome</CardTitle>
        <CardDescription>Get started with Noa UI</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Your content goes here</p>
      </CardContent>
      <CardFooter>
        <Button variant="primary">Get Started</Button>
      </CardFooter>
    </Card>
  );
}
```

### Theme Toggle

```tsx
import { useState, useEffect } from 'react';
import { getThemeManager } from '@noa/ui/themes';
import { Button } from '@noa/ui';

function ThemeToggle() {
  const manager = getThemeManager();
  const [theme, setTheme] = useState(manager.getConfig().resolvedTheme);

  useEffect(() => {
    return manager.subscribe((config) => {
      setTheme(config.resolvedTheme);
    });
  }, []);

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => manager.toggleTheme()}
    >
      {theme === 'dark' ? '🌙' : '☀️'}
    </Button>
  );
}
```

### Badges & Avatars

```tsx
import { Badge, Avatar, AvatarGroup } from '@noa/ui';

function UserStatus() {
  return (
    <div>
      <Avatar
        src="/user.jpg"
        fallback="JD"
        size="lg"
      />
      <Badge variant="success" dot>Online</Badge>

      <AvatarGroup max={3}>
        <Avatar fallback="U1" />
        <Avatar fallback="U2" />
        <Avatar fallback="U3" />
        <Avatar fallback="U4" />
      </AvatarGroup>
    </div>
  );
}
```

## Common Patterns

### Loading States

```tsx
import { Button, Card, CardContent } from '@noa/ui';

function LoadingExample() {
  const [loading, setLoading] = useState(false);

  return (
    <Card>
      <CardContent>
        {loading ? (
          <div className="skeleton h-20 w-full" />
        ) : (
          <p>Content loaded</p>
        )}

        <Button
          loading={loading}
          onClick={() => setLoading(true)}
        >
          Load Data
        </Button>
      </CardContent>
    </Card>
  );
}
```

### Form Validation

```tsx
import { Input, Button } from '@noa/ui';
import { useState } from 'react';

function ValidatedForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.includes('@')) {
      setError('Invalid email address');
      return;
    }
    setError('');
    // Submit form
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={error}
        placeholder="Enter email"
      />
      <Button type="submit">Submit</Button>
    </form>
  );
}
```

### Responsive Layout

```tsx
import { Card, Button } from '@noa/ui';

function ResponsiveGrid() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card variant="elevated">
        <CardContent>Card 1</CardContent>
      </Card>
      <Card variant="elevated">
        <CardContent>Card 2</CardContent>
      </Card>
      <Card variant="elevated">
        <CardContent>Card 3</CardContent>
      </Card>
    </div>
  );
}
```

## Design Tokens

### Using Color Tokens

```tsx
// Using Tailwind classes
<div className="bg-primary-500 text-white">Primary background</div>
<div className="text-error-600">Error text</div>
<div className="border border-neutral-300">Bordered</div>

// Using CSS variables
<div style={{
  backgroundColor: 'rgb(var(--color-primary-500))'
}}>
  Custom styling
</div>
```

### Spacing & Typography

```tsx
// Spacing (4px base unit)
<div className="p-4 mb-6">Padded with margin</div>
<div className="space-y-8">Vertical spacing</div>

// Typography
<h1 className="text-4xl font-bold">Large heading</h1>
<p className="text-base font-normal">Body text</p>
<span className="text-sm text-muted-foreground">Helper text</span>
```

### Utility Classes

```tsx
// Text gradients
<h1 className="text-gradient-primary">Gradient headline</h1>

// Glass morphism
<div className="glass p-6 rounded-lg">Glassmorphic card</div>

// Animations
<div className="animate-fade-in">Fade in animation</div>
<div className="animate-slide-in-up">Slide up animation</div>

// Custom scrollbars
<div className="scrollbar-thin h-64 overflow-auto">
  Scrollable content
</div>
```

## Accessibility

All components are accessible by default:

```tsx
// Keyboard navigation works automatically
<Button>Focusable button</Button>

// Screen reader support
<Input aria-label="Email address" />

// Focus indicators
<button className="focus-ring">Custom focus ring</button>

// Skip to main content
<a href="#main" className="sr-only-focusable">
  Skip to main content
</a>
```

## Dark Mode

```tsx
import { getThemeManager } from '@noa/ui/themes';

// Set theme programmatically
const manager = getThemeManager();
manager.setTheme('dark');    // Force dark mode
manager.setTheme('light');   // Force light mode
manager.setTheme('system');  // Follow system preference
manager.toggleTheme();       // Toggle between light/dark

// Get current theme
const { resolvedTheme } = manager.getConfig();
console.log(resolvedTheme); // 'light' or 'dark'
```

## Build Commands

```bash
# Development (watch mode)
pnpm dev

# Production build
pnpm build

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Testing
pnpm test
pnpm test:a11y  # Accessibility tests
```

## What's Next?

1. Explore the [full documentation](./README.md)
2. Check out [design tokens reference](./DESIGN_TOKENS.md)
3. View the [component showcase](./src/examples/component-showcase.tsx)
4. Read about [accessibility features](./docs/ui-design-system.md#accessibility)

## Common Issues

### Styles not loading

Make sure you've imported the global styles:
```tsx
import '@noa/ui/styles';
```

### Tailwind classes not working

Verify your `tailwind.config.js` includes the UI package in content:
```js
content: [
  './src/**/*.{js,ts,jsx,tsx}',
  './node_modules/@noa/ui/dist/**/*.{js,mjs}',
],
```

### Theme not persisting

Ensure you're calling `initializeTheme()` on app mount:
```tsx
useEffect(() => {
  initializeTheme();
}, []);
```

## Support

For issues or questions:
- Check the [full documentation](./docs/ui-design-system.md)
- Review [component examples](./src/examples/component-showcase.tsx)
- Open an issue in the repository

## License

MIT
