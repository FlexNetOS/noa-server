# Design Tokens Reference

Complete reference for all design tokens in the Noa UI Design System.

## Color Palette

### Primary (Sky Blue)
Brand color for CTAs, links, and primary actions.

```css
50:  #f0f9ff  rgb(240 249 255)
100: #e0f2fe  rgb(224 242 254)
200: #bae6fd  rgb(186 230 253)
300: #7dd3fc  rgb(125 211 252)
400: #38bdf8  rgb(56 189 248)
500: #0ea5e9  rgb(14 165 233)  /* Base */
600: #0284c7  rgb(2 132 199)
700: #0369a1  rgb(3 105 161)
800: #075985  rgb(7 89 133)
900: #0c4a6e  rgb(12 74 110)
950: #082f49  rgb(8 47 73)
```

### Secondary (Purple)
Supporting brand color for secondary elements.

```css
50:  #faf5ff  rgb(250 245 255)
100: #f3e8ff  rgb(243 232 255)
200: #e9d5ff  rgb(233 213 255)
300: #d8b4fe  rgb(216 180 254)
400: #c084fc  rgb(192 132 252)
500: #a855f7  rgb(168 85 247)  /* Base */
600: #9333ea  rgb(147 51 234)
700: #7e22ce  rgb(126 34 206)
800: #6b21a8  rgb(107 33 168)
900: #581c87  rgb(88 28 135)
950: #3b0764  rgb(59 7 100)
```

### Success (Green)
Success states, confirmations, positive actions.

```css
50:  #f0fdf4  rgb(240 253 244)
100: #dcfce7  rgb(220 252 231)
200: #bbf7d0  rgb(187 247 208)
300: #86efac  rgb(134 239 172)
400: #4ade80  rgb(74 222 128)
500: #22c55e  rgb(34 197 94)   /* Base */
600: #16a34a  rgb(22 163 74)
700: #15803d  rgb(21 128 61)
800: #166534  rgb(22 101 52)
900: #14532d  rgb(20 83 45)
950: #052e16  rgb(5 46 22)
```

### Warning (Amber)
Warning states, alerts, attention required.

```css
50:  #fffbeb  rgb(255 251 235)
100: #fef3c7  rgb(254 243 199)
200: #fde68a  rgb(253 230 138)
300: #fcd34d  rgb(252 211 77)
400: #fbbf24  rgb(251 191 36)
500: #f59e0b  rgb(245 158 11)  /* Base */
600: #d97706  rgb(217 119 6)
700: #b45309  rgb(180 83 9)
800: #92400e  rgb(146 64 14)
900: #78350f  rgb(120 53 15)
950: #451a03  rgb(69 26 3)
```

### Error (Red)
Error states, destructive actions, critical issues.

```css
50:  #fef2f2  rgb(254 242 242)
100: #fee2e2  rgb(254 226 226)
200: #fecaca  rgb(254 202 202)
300: #fca5a5  rgb(252 165 165)
400: #f87171  rgb(248 113 113)
500: #ef4444  rgb(239 68 68)   /* Base */
600: #dc2626  rgb(220 38 38)
700: #b91c1c  rgb(185 28 28)
800: #991b1b  rgb(153 27 27)
900: #7f1d1d  rgb(127 29 29)
950: #450a0a  rgb(69 10 10)
```

### Neutral (Gray)
Text, backgrounds, borders, UI elements.

```css
50:  #fafafa  rgb(250 250 250)
100: #f5f5f5  rgb(245 245 245)
200: #e5e5e5  rgb(229 229 229)
300: #d4d4d4  rgb(212 212 212)
400: #a3a3a3  rgb(163 163 163)
500: #737373  rgb(115 115 115)  /* Base */
600: #525252  rgb(82 82 82)
700: #404040  rgb(64 64 64)
800: #262626  rgb(38 38 38)
900: #171717  rgb(23 23 23)
950: #0a0a0a  rgb(10 10 10)
```

## Typography Scale

### Font Sizes

| Token    | Size    | Line Height | Letter Spacing | Usage                  |
|----------|---------|-------------|----------------|------------------------|
| xs       | 0.75rem | 1rem        | 0.025em        | Captions, labels       |
| sm       | 0.875rem| 1.25rem     | 0.0125em       | Small text, footnotes  |
| base     | 1rem    | 1.5rem      | 0              | Body text              |
| lg       | 1.125rem| 1.75rem     | -0.0125em      | Large body text        |
| xl       | 1.25rem | 1.75rem     | -0.0125em      | Small headings         |
| 2xl      | 1.5rem  | 2rem        | -0.025em       | Card titles            |
| 3xl      | 1.875rem| 2.25rem     | -0.025em       | Section headers        |
| 4xl      | 2.25rem | 2.5rem      | -0.025em       | Page titles            |
| 5xl      | 3rem    | 1           | -0.025em       | Hero headlines         |
| 6xl      | 3.75rem | 1           | -0.025em       | Large displays         |
| 7xl      | 4.5rem  | 1           | -0.025em       | Extra large displays   |
| 8xl      | 6rem    | 1           | -0.025em       | Massive displays       |
| 9xl      | 8rem    | 1           | -0.025em       | Extreme displays       |

### Font Weights

```css
font-light:     300
font-normal:    400
font-medium:    500
font-semibold:  600
font-bold:      700
font-extrabold: 800
```

## Spacing Scale

Based on 4px grid system.

| Token | Value   | Pixels | Usage                           |
|-------|---------|--------|---------------------------------|
| px    | 1px     | 1px    | Thin borders                    |
| 0.5   | 0.125rem| 2px    | Micro spacing                   |
| 1     | 0.25rem | 4px    | Smallest spacing unit           |
| 2     | 0.5rem  | 8px    | Compact spacing                 |
| 3     | 0.75rem | 12px   | Small gaps                      |
| 4     | 1rem    | 16px   | Default spacing                 |
| 6     | 1.5rem  | 24px   | Medium gaps                     |
| 8     | 2rem    | 32px   | Large gaps                      |
| 12    | 3rem    | 48px   | Section spacing                 |
| 16    | 4rem    | 64px   | Large section spacing           |
| 24    | 6rem    | 96px   | Extra large spacing             |
| 32    | 8rem    | 128px  | Hero spacing                    |
| 48    | 12rem   | 192px  | Massive spacing                 |

## Border Radius

| Token   | Value     | Usage                           |
|---------|-----------|---------------------------------|
| none    | 0         | No rounding                     |
| sm      | 0.125rem  | Subtle rounding                 |
| DEFAULT | 0.25rem   | Default rounding (4px)          |
| md      | 0.375rem  | Medium rounding                 |
| lg      | 0.5rem    | Large rounding (8px)            |
| xl      | 0.75rem   | Extra large rounding            |
| 2xl     | 1rem      | Very large rounding             |
| 3xl     | 1.5rem    | Massive rounding                |
| full    | 9999px    | Fully rounded (pills, circles)  |

## Shadows

### Elevation Shadows

```css
xs:      0 1px 2px 0 rgb(0 0 0 / 0.05)
sm:      0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)
DEFAULT: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)
md:      0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)
lg:      0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)
xl:      0 25px 50px -12px rgb(0 0 0 / 0.25)
2xl:     0 25px 50px -12px rgb(0 0 0 / 0.25)
inner:   inset 0 2px 4px 0 rgb(0 0 0 / 0.05)
```

### Colored Shadows

```css
shadow-primary:   0 10px 15px -3px rgb(14 165 233 / 0.3)...
shadow-secondary: 0 10px 15px -3px rgb(168 85 247 / 0.3)...
shadow-success:   0 10px 15px -3px rgb(34 197 94 / 0.3)...
shadow-error:     0 10px 15px -3px rgb(239 68 68 / 0.3)...
```

## Breakpoints

Mobile-first responsive breakpoints.

| Breakpoint | Min Width | Device Type                |
|------------|-----------|----------------------------|
| xs         | 475px     | Extra small devices        |
| sm         | 640px     | Small devices (phones)     |
| md         | 768px     | Medium devices (tablets)   |
| lg         | 1024px    | Large devices (laptops)    |
| xl         | 1280px    | Extra large (desktops)     |
| 2xl        | 1536px    | 2X large (large desktops)  |

## Z-Index Scale

Stacking context layers.

```css
0:               0
10:              10
20:              20
30:              30
40:              40
50:              50
auto:            auto
dropdown:        1000
sticky:          1020
fixed:           1030
modal-backdrop:  1040
modal:           1050
popover:         1060
tooltip:         1070
```

## Transition Durations

```css
DEFAULT: 200ms
75:      75ms
100:     100ms
150:     150ms
200:     200ms
300:     300ms
500:     500ms
700:     700ms
1000:    1000ms
```

## Animation Keyframes

### Fade Animations
- `fade-in`: Opacity 0 → 1 (200ms)
- `fade-out`: Opacity 1 → 0 (200ms)

### Slide Animations
- `slide-in-up`: Translate Y from 10px to 0 (300ms)
- `slide-in-down`: Translate Y from -10px to 0 (300ms)
- `slide-in-left`: Translate X from -10px to 0 (300ms)
- `slide-in-right`: Translate X from 10px to 0 (300ms)

### Scale Animations
- `scale-in`: Scale 0.95 → 1 (200ms)
- `scale-out`: Scale 1 → 0.95 (200ms)

### Special Animations
- `spin-slow`: 360° rotation in 3s
- `pulse-soft`: Opacity 1 → 0.8 → 1 in 2s
- `shimmer`: Background position animation in 2s

## Semantic Tokens

### Light Mode

```css
--color-background:        255 255 255   /* White */
--color-foreground:        23 23 23      /* Near black */
--color-card:              255 255 255   /* White */
--color-card-foreground:   23 23 23      /* Near black */
--color-border:            229 229 229   /* Neutral-200 */
--color-input:             229 229 229   /* Neutral-200 */
--color-ring:              14 165 233    /* Primary-500 */
--color-muted:             245 245 245   /* Neutral-100 */
--color-muted-foreground:  115 115 115   /* Neutral-500 */
--color-accent:            245 245 245   /* Neutral-100 */
--color-accent-foreground: 23 23 23      /* Near black */
--color-popover:           255 255 255   /* White */
--color-popover-foreground:23 23 23      /* Near black */
```

### Dark Mode

```css
--color-background:        10 10 10      /* Near black */
--color-foreground:        250 250 250   /* Near white */
--color-card:              23 23 23      /* Neutral-900 */
--color-card-foreground:   250 250 250   /* Near white */
--color-border:            38 38 38      /* Neutral-800 */
--color-input:             38 38 38      /* Neutral-800 */
--color-ring:              56 189 248    /* Primary-400 */
--color-muted:             38 38 38      /* Neutral-800 */
--color-muted-foreground:  163 163 163   /* Neutral-600 */
--color-accent:            38 38 38      /* Neutral-800 */
--color-accent-foreground: 250 250 250   /* Near white */
--color-popover:           23 23 23      /* Neutral-900 */
--color-popover-foreground:250 250 250   /* Near white */
```

## Usage Examples

### Colors
```tsx
<div className="bg-primary-500 text-white">Primary background</div>
<div className="border-2 border-neutral-300">Bordered element</div>
<span className="text-error-600">Error message</span>
```

### Spacing
```tsx
<div className="p-4 mb-6">Padded with margin</div>
<div className="space-y-8">Stacked children with gap</div>
<div className="gap-x-4 gap-y-2">Grid with different gaps</div>
```

### Typography
```tsx
<h1 className="text-4xl font-bold">Large heading</h1>
<p className="text-base font-normal">Body text</p>
<span className="text-sm text-muted-foreground">Helper text</span>
```

### Shadows
```tsx
<div className="shadow-lg">Elevated card</div>
<button className="shadow-primary">Primary button with glow</button>
```

### Responsive
```tsx
<div className="text-sm md:text-base lg:text-lg">
  Responsive text size
</div>
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  Responsive grid
</div>
```

## Best Practices

1. **Use Design Tokens**: Always use tokens instead of arbitrary values
2. **Consistent Spacing**: Stick to the 4px grid system
3. **Semantic Colors**: Use semantic tokens (background, foreground) over specific shades
4. **Mobile-First**: Design for small screens first, then scale up
5. **Accessibility**: Maintain 4.5:1 contrast ratio for text
6. **Dark Mode**: Test all designs in both light and dark modes
7. **Performance**: Prefer Tailwind classes over inline styles

## Custom Token Usage

### CSS Variables
```css
.custom-element {
  background: rgb(var(--color-primary-500));
  color: rgb(var(--color-foreground));
  padding: var(--spacing-4);
}
```

### Tailwind Arbitrary Values
```tsx
<div className="bg-[rgb(var(--color-primary-500))]">
  Using CSS variable in Tailwind
</div>
```

### JavaScript/TypeScript
```typescript
import { getThemeVariables } from '@noa/ui/themes';

const colors = getThemeVariables('light');
console.log(colors.primary); // 'rgb(14 165 233)'
```
