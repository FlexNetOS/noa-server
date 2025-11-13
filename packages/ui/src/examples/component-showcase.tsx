/**
 * Component Showcase
 * Example usage of all UI components
 */

import { useState } from 'react';
import {
  Button,
  Input,
  Select,
  Checkbox,
  Switch,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Avatar,
  AvatarGroup,
} from '../components/ui';
import { getThemeManager } from '../styles/themes';

export function ComponentShowcase() {
  const [theme, setTheme] = useState('light');
  const [enabled, setEnabled] = useState(false);
  const [checked, setChecked] = useState(false);
  const themeManager = getThemeManager();

  const toggleTheme = () => {
    themeManager.toggleTheme();
    setTheme(themeManager.getConfig().resolvedTheme);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gradient-primary">
              Noa UI Design System
            </h1>
            <p className="mt-2 text-muted-foreground">
              Beautiful, accessible components built with TailwindCSS 4.0
            </p>
          </div>
          <Button onClick={toggleTheme} variant="outline" size="icon">
            {theme === 'dark' ? '🌙' : '☀️'}
          </Button>
        </div>

        {/* Buttons */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Buttons</CardTitle>
            <CardDescription>
              Multiple variants and sizes with loading states
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="success">Success</Button>
                <Button variant="warning">Warning</Button>
                <Button variant="error">Error</Button>
                <Button variant="link">Link</Button>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
                <Button size="xl">Extra Large</Button>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button loading>Loading</Button>
                <Button disabled>Disabled</Button>
                <Button variant="primary" fullWidth>
                  Full Width
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inputs */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Form Controls</CardTitle>
            <CardDescription>
              Inputs, selects, checkboxes, and switches
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Input placeholder="Default input" />
                <Input
                  placeholder="Email"
                  type="email"
                  hint="We'll never share your email"
                />
                <Input
                  placeholder="Error state"
                  error="This field is required"
                />
                <Input size="lg" placeholder="Large input" />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Select
                  options={[
                    { value: '1', label: 'Option 1' },
                    { value: '2', label: 'Option 2' },
                    { value: '3', label: 'Option 3' },
                  ]}
                  helperText="Choose an option"
                />
                <Select
                  options={[
                    { value: '1', label: 'Error example' },
                  ]}
                  error="Please select a valid option"
                />
              </div>

              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={checked}
                    onChange={(e) => setChecked(e.target.checked)}
                  />
                  <span>Checkbox</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox indeterminate />
                  <span>Indeterminate</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch checked={enabled} onChange={setEnabled} />
                  <span>Switch {enabled ? 'On' : 'Off'}</span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card variant="default">
            <CardHeader>
              <CardTitle>Default Card</CardTitle>
              <CardDescription>With subtle shadow</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This is a default card variant with subtle shadow styling.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm">
                Action
              </Button>
            </CardFooter>
          </Card>

          <Card variant="elevated" hoverable>
            <CardHeader>
              <CardTitle>Elevated Card</CardTitle>
              <CardDescription>Hover for effect</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Elevated variant with hover interaction.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="primary" size="sm">
                Click me
              </Button>
            </CardFooter>
          </Card>

          <Card variant="outlined">
            <CardHeader>
              <CardTitle>Outlined Card</CardTitle>
              <CardDescription>Bold border</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Outlined variant with 2px border.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="secondary" size="sm">
                Learn more
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Badges */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Badges</CardTitle>
            <CardDescription>
              Status indicators with multiple variants
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Badge variant="default">Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="error">Error</Badge>
                <Badge variant="neutral">Neutral</Badge>
                <Badge variant="outline">Outline</Badge>
              </div>

              <div className="flex flex-wrap gap-3">
                <Badge size="sm">Small</Badge>
                <Badge size="md">Medium</Badge>
                <Badge size="lg">Large</Badge>
              </div>

              <div className="flex flex-wrap gap-3">
                <Badge variant="success" dot>
                  With Dot
                </Badge>
                <Badge variant="warning" removable onRemove={() => {}}>
                  Removable
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Avatars */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Avatars</CardTitle>
            <CardDescription>
              User profile pictures with fallbacks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-4">
                <Avatar fallback="JD" size="sm" />
                <Avatar fallback="JD" size="md" />
                <Avatar fallback="JD" size="lg" />
                <Avatar fallback="JD" size="xl" />
                <Avatar fallback="JD" size="2xl" />
              </div>

              <div>
                <p className="mb-3 text-sm font-medium">Avatar Group</p>
                <AvatarGroup max={3}>
                  <Avatar fallback="U1" size="md" />
                  <Avatar fallback="U2" size="md" />
                  <Avatar fallback="U3" size="md" />
                  <Avatar fallback="U4" size="md" />
                  <Avatar fallback="U5" size="md" />
                </AvatarGroup>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Utility Classes */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Utility Classes</CardTitle>
            <CardDescription>
              Gradients, animations, and special effects
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <p className="mb-2 text-sm font-medium">Text Gradients</p>
                <h2 className="text-3xl font-bold text-gradient-primary">
                  Primary Gradient
                </h2>
                <h2 className="text-3xl font-bold text-gradient-secondary">
                  Secondary Gradient
                </h2>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">Glass Morphism</p>
                <div className="glass relative h-32 rounded-lg p-6">
                  <p className="font-medium">Glassmorphic Card</p>
                  <p className="text-sm text-muted-foreground">
                    With backdrop blur effect
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">Animations</p>
                <div className="flex flex-wrap gap-3">
                  <div className="animate-fade-in rounded bg-primary-500 px-4 py-2 text-white">
                    Fade In
                  </div>
                  <div className="animate-slide-in-up rounded bg-secondary-500 px-4 py-2 text-white">
                    Slide Up
                  </div>
                  <div className="animate-pulse-soft rounded bg-success-500 px-4 py-2 text-white">
                    Pulse
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Built with TailwindCSS 4.0 • TypeScript • React
          </p>
        </div>
      </div>
    </div>
  );
}

export default ComponentShowcase;
