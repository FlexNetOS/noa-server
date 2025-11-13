/**
 * Card Component
 * A container component with variants for different styles
 */

import * as React from 'react';
import { tv, type VariantProps } from 'tailwind-variants';
import { cn } from '../../utils/cn';

const card = tv({
  slots: {
    base: [
      'rounded-lg border bg-card text-card-foreground',
      'transition-all duration-200',
    ],
    header: 'flex flex-col space-y-1.5 p-6',
    title: 'font-semibold leading-none tracking-tight',
    description: 'text-sm text-muted-foreground',
    content: 'p-6 pt-0',
    footer: 'flex items-center p-6 pt-0',
  },
  variants: {
    variant: {
      default: {
        base: 'shadow-sm',
      },
      elevated: {
        base: 'shadow-md hover:shadow-lg',
      },
      outlined: {
        base: 'border-2',
      },
      ghost: {
        base: 'border-0 shadow-none',
      },
    },
    hoverable: {
      true: {
        base: 'cursor-pointer hover:bg-accent/50',
      },
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

const { base, header, title, description, content, footer } = card();

// Card Root
export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof card> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, hoverable, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(base({ variant, hoverable }), className)}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';

// Card Header
export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn(header(), className)} {...props} />;
  }
);
CardHeader.displayName = 'CardHeader';

// Card Title
export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, ...props }, ref) => {
    return <h3 ref={ref} className={cn(title(), className)} {...props} />;
  }
);
CardTitle.displayName = 'CardTitle';

// Card Description
export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, ...props }, ref) => {
    return <p ref={ref} className={cn(description(), className)} {...props} />;
  }
);
CardDescription.displayName = 'CardDescription';

// Card Content
export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn(content(), className)} {...props} />;
  }
);
CardContent.displayName = 'CardContent';

// Card Footer
export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn(footer(), className)} {...props} />;
  }
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
