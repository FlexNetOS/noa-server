# Noa UI Design System

A comprehensive, accessible, and beautiful design system built with TailwindCSS 4.0, featuring design tokens, component variants, and dark mode support.

## Features

- **TailwindCSS 4.0** with optimized configuration
- **Design Tokens** for consistent theming
- **Dark Mode** with class-based switching and system preference detection
- **Component Variants** using tailwind-variants
- **Accessibility** built-in (WCAG compliant)
- **Responsive** breakpoints and mobile-first design
- **Type-Safe** with TypeScript
- **Tree-Shakeable** for optimal bundle size

## Installation

```bash
cd packages/ui
pnpm install
```

## Usage

### Import Styles

Import the global styles in your app root:

```tsx
import '@noa/ui/styles';
```

### Using Components

```tsx
import { Button, Card, Badge, Input } from '@noa/ui';

function App() {
  return (
    <Card variant="elevated">
      <Card.Header>
        <Card.Title>Welcome</Card.Title>
        <Card.Description>Get started with Noa UI</Card.Description>
      </Card.Header>
      <Card.Content>
        <Input placeholder="Enter your name" />
      </Card.Content>
      <Card.Footer>
        <Button variant="primary" size="lg">
          Get Started
        </Button>
        <Badge variant="success">New</Badge>
      </Card.Footer>
    </Card>
  );
}
```

### Theme Management

```tsx
import { getThemeManager } from '@noa/ui/themes';

const themeManager = getThemeManager();

// Set theme
themeManager.setTheme('dark'); // 'light' | 'dark' | 'system'

// Toggle theme
themeManager.toggleTheme();

// Subscribe to changes
const unsubscribe = themeManager.subscribe((config) => {
  console.log('Theme changed:', config.resolvedTheme);
});
```

## Design Tokens

### Colors

The design system includes 6 color palettes with 11 shades each:

- **Primary**: Sky blue (#0ea5e9) - Brand and CTAs
- **Secondary**: Purple (#a855f7) - Supporting elements
- **Success**: Green (#22c55e) - Success states
- **Warning**: Amber (#f59e0b) - Warning states
- **Error**: Red (#ef4444) - Error states
- **Neutral**: Gray scale - Text and backgrounds

Each color has shades from 50 (lightest) to 950 (darkest).

### Typography

Mobile-first responsive typography scale:

```typescript
Display: 36px/40px - Hero headlines
H1: 30px/36px - Page titles
H2: 24px/32px - Section headers
H3: 20px/28px - Card titles
Body: 16px/24px - Default text
Small: 14px/20px - Secondary text
Tiny: 12px/16px - Captions
```

### Spacing

4px base unit with a consistent scale:

```typescript
0.5 = 2px   | 1 = 4px    | 2 = 8px    | 3 = 12px
4 = 16px    | 6 = 24px   | 8 = 32px   | 12 = 48px
16 = 64px   | 24 = 96px  | 32 = 128px | 48 = 192px
```

### Shadows

Elevation system with 7 levels plus colored shadows:

```css
xs, sm, DEFAULT, md, lg, xl, 2xl
shadow-primary, shadow-secondary, shadow-success, shadow-error
```

## Components

### Button

Versatile button component with 8 variants and 5 sizes:

```tsx
<Button variant="primary" size="md">Click me</Button>
<Button variant="outline" size="lg" fullWidth>Full Width</Button>
<Button variant="ghost" size="icon" loading>Loading...</Button>
```

**Variants**: primary, secondary, outline, ghost, success, warning, error, link

**Sizes**: sm, md, lg, xl, icon

### Input

Form input with error handling and helper text:

```tsx
<Input
  placeholder="Email"
  type="email"
  error="Invalid email address"
/>
<Input
  size="lg"
  helperText="We'll never share your email"
/>
```

### Card

Container component with multiple sections:

```tsx
<Card variant="elevated" hoverable>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Content goes here</CardContent>
  <CardFooter>Footer actions</CardFooter>
</Card>
```

**Variants**: default, elevated, outlined, ghost

### Badge

Status indicator with dot and removable options:

```tsx
<Badge variant="success" size="md">Active</Badge>
<Badge variant="warning" dot>Processing</Badge>
<Badge variant="error" removable onRemove={() => {}}>Remove</Badge>
```

**Variants**: default, secondary, success, warning, error, neutral, outline

### Avatar

User profile picture with fallback:

```tsx
<Avatar
  src="/path/to/image.jpg"
  alt="User Name"
  fallback="JD"
  size="lg"
/>

<AvatarGroup max={3}>
  <Avatar src="/user1.jpg" fallback="U1" />
  <Avatar src="/user2.jpg" fallback="U2" />
  <Avatar src="/user3.jpg" fallback="U3" />
  <Avatar src="/user4.jpg" fallback="U4" />
</AvatarGroup>
```

**Sizes**: sm, md, lg, xl, 2xl

### Switch

Toggle switch for boolean states:

```tsx
<Switch
  checked={enabled}
  onChange={setEnabled}
  size="md"
/>
```

### Checkbox

Checkbox with indeterminate state support:

```tsx
<Checkbox
  checked={isChecked}
  onChange={(e) => setChecked(e.target.checked)}
/>
<Checkbox indeterminate />
```

### Select

Native select with custom styling:

```tsx
<Select
  options={[
    { value: '1', label: 'Option 1' },
    { value: '2', label: 'Option 2' },
  ]}
  error="Please select an option"
/>
```

## Dark Mode

### Automatic Detection

The theme system automatically detects system preferences and persists user choices to localStorage.

### Implementation

```tsx
// Initialize theme on app start
import { initializeTheme } from '@noa/ui/themes';

initializeTheme(); // Applies theme based on stored preference or system

// Use ThemeManager for advanced control
import { getThemeManager } from '@noa/ui/themes';

const manager = getThemeManager();

// Get current config
const { theme, systemTheme, resolvedTheme } = manager.getConfig();

// Set theme programmatically
manager.setTheme('dark');

// React integration example
function ThemeToggle() {
  const [config, setConfig] = useState(manager.getConfig());

  useEffect(() => {
    return manager.subscribe(setConfig);
  }, []);

  return (
    <button onClick={() => manager.toggleTheme()}>
      {config.resolvedTheme === 'dark' ? '🌙' : '☀️'}
    </button>
  );
}
```

### CSS Variables

All colors are available as CSS variables for custom styling:

```css
.custom-element {
  background: rgb(var(--color-primary-500));
  color: rgb(var(--color-foreground));
  border: 1px solid rgb(var(--color-border));
}
```

## Animations

Built-in animations for smooth interactions:

```tsx
<div className="animate-fade-in">Fade in</div>
<div className="animate-slide-in-up">Slide up</div>
<div className="animate-scale-in">Scale in</div>
<div className="animate-pulse-soft">Pulse</div>
<div className="animate-shimmer">Shimmer effect</div>
```

**Available animations**:
- fade-in, fade-out
- slide-in-up, slide-in-down, slide-in-left, slide-in-right
- scale-in, scale-out
- spin-slow, pulse-soft, shimmer

## Utility Classes

### Text Gradients

```tsx
<h1 className="text-gradient-primary">Gradient Text</h1>
<h2 className="text-gradient-secondary">Purple Gradient</h2>
```

### Glass Morphism

```tsx
<div className="glass p-6 rounded-lg">
  Glassmorphic container
</div>
```

### Gradient Backgrounds

```tsx
<div className="gradient-primary p-8">Primary gradient</div>
<div className="gradient-mesh p-8">Mesh gradient</div>
```

### Custom Scrollbars

```tsx
<div className="scrollbar-thin overflow-auto">
  Thin scrollbar
</div>
<div className="scrollbar-hide overflow-auto">
  Hidden scrollbar
</div>
```

### Truncate Text

```tsx
<p className="truncate-2">Text truncated to 2 lines...</p>
<p className="truncate-3">Text truncated to 3 lines...</p>
```

## Accessibility

All components follow WCAG 2.1 AA standards:

- **Keyboard Navigation**: Full support with visible focus indicators
- **Screen Readers**: Proper ARIA labels and semantic HTML
- **Color Contrast**: Minimum 4.5:1 ratio for text
- **Focus Management**: Logical tab order and focus trapping
- **Reduced Motion**: Respects `prefers-reduced-motion`

### Focus Utilities

```tsx
<button className="focus-ring">Auto focus ring</button>
<input className="focus-ring-error" />
<a className="sr-only-focusable">Skip to main content</a>
```

## Responsive Design

Mobile-first breakpoints:

```typescript
xs: 475px   // Extra small devices
sm: 640px   // Small devices
md: 768px   // Medium devices
lg: 1024px  // Large devices
xl: 1280px  // Extra large devices
2xl: 1536px // 2X large devices
```

Usage:

```tsx
<div className="text-sm md:text-base lg:text-lg">
  Responsive text
</div>
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  Responsive grid
</div>
```

## Performance

- **Tree-shaking**: Only import what you use
- **CSS-in-JS Free**: Zero runtime overhead
- **Optimized Builds**: Minimal bundle size with tsup
- **Lazy Loading**: Code-split components

## Best Practices

1. **Use Semantic HTML**: Start with proper HTML elements
2. **Leverage Design Tokens**: Use theme colors instead of arbitrary values
3. **Compose Components**: Build complex UIs from primitives
4. **Test Accessibility**: Use keyboard navigation and screen readers
5. **Optimize Performance**: Import only needed components
6. **Dark Mode First**: Design with both themes in mind

## Build Commands

```bash
# Development
pnpm dev          # Watch mode

# Production
pnpm build        # Build all exports
pnpm typecheck    # Type checking
pnpm lint         # ESLint

# Clean
pnpm clean        # Remove dist folder
```

## File Structure

```
packages/ui/
├── src/
│   ├── components/
│   │   └── ui/           # Primitive components
│   │       ├── button.tsx
│   │       ├── input.tsx
│   │       ├── card.tsx
│   │       ├── badge.tsx
│   │       ├── avatar.tsx
│   │       ├── switch.tsx
│   │       ├── checkbox.tsx
│   │       ├── select.tsx
│   │       └── index.ts
│   ├── styles/
│   │   ├── globals.css   # Global styles
│   │   └── themes.ts     # Theme management
│   ├── utils/
│   │   ├── cn.ts         # Class name utility
│   │   └── index.ts
│   └── index.ts          # Main entry
├── tailwind.config.ts    # Tailwind config
├── tsconfig.json         # TypeScript config
├── tsup.config.ts        # Build config
├── postcss.config.js     # PostCSS config
└── package.json
```

## Contributing

When adding new components:

1. Follow existing component patterns
2. Use tailwind-variants for variants
3. Include all component states (hover, focus, disabled, error)
4. Add dark mode variants
5. Ensure accessibility
6. Document props and usage
7. Export from `components/ui/index.ts`

## License

MIT
